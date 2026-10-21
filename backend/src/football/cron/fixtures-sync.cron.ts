import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from 'src/prisma/prisma.service'
import { RedisService } from 'src/redis/redis.service'
import { FootballDataProvider } from '../football-data.provider'
import { mapStatus } from '../mappers/mapStatus'
import { fixturesCacheKey, resolveRound } from '../mappers/round'
import { FootballRefsService } from '../services/refs.service'
import { upsertVenue } from '../upserts/upsert-venue'

@Injectable()
export class FixturesSyncCron {
  private readonly logger = new Logger(FixturesSyncCron.name)

  private readonly FROM_DAYS_AGO = 10
  private readonly DAYS_FORWARD = 7
  private readonly LEAGUE_ID = 128
  private readonly SEASON = 2026

  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: FootballDataProvider,
    private readonly redis: RedisService,
    private readonly refs: FootballRefsService,
  ) {}

  // @Cron(CronExpression.EVERY_DAY_AT_10AM)
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handle() {
    const baseDate = new Date()

    const fromDate = new Date(baseDate)
    fromDate.setDate(baseDate.getDate() - this.FROM_DAYS_AGO)

    const toDate = new Date(baseDate)
    toDate.setDate(baseDate.getDate() + this.DAYS_FORWARD)

    const from = fromDate.toISOString().split('T')[0]
    const to = toDate.toISOString().split('T')[0]

    // La liga se identifica internamente por su ID de API-Football (ancla);
    // el ID que se le pide al proveedor activo sale de ProviderRef.
    const league = await this.prisma.leagues.findUnique({
      where: { api_league_id: this.LEAGUE_ID },
    })

    if (!league) {
      throw new Error('League not found in database')
    }

    const leagueExternalId = await this.refs.leagueExternalId(league)
    if (leagueExternalId === null) {
      this.logger.warn(
        `La liga ${league.name} no tiene ID en ${this.refs.providerName}; se saltea la sincronización.`,
      )
      return
    }

    const fixtures = await this.provider.getFixtures({
      leagueExternalId,
      season: this.SEASON,
      from,
      to,
    })

    this.logger.debug(`Fixtures recibidos del proveedor: ${fixtures.length}`)

    if (fixtures.length === 0) {
      this.logger.log('No fixtures found')
      return
    }

    const matchdaysToInvalidate = new Set<string>()

    for (const f of fixtures) {
      const homeTeam = await this.refs.resolveTeam(this.prisma, f.home)
      const awayTeam = await this.refs.resolveTeam(this.prisma, f.away)
      const venueId = await upsertVenue(this.prisma, f.venue)

      if (!homeTeam || !awayTeam) {
        this.logger.warn(
          `Saltando fixture ${f.externalId}: equipo incompleto o sin vincular.`,
        )
        continue
      }

      const { round, tournament, matchdayKey } = resolveRound(
        f.league.round,
        'N/A',
      )

      const changing = {
        date: new Date(f.date),
        timestamp: f.timestamp,
        status: mapStatus(f.status.short),
        status_short: f.status.short,
        status_long: f.status.long,
        referee: f.referee ?? null,
        venue_id: venueId,
        round,
        tournament,
        home_goals: f.goals.home ?? 0,
        away_goals: f.goals.away ?? 0,
        elapsed: f.status.elapsed,
        home_penalty_goals: f.penalty.home ?? null,
        away_penalty_goals: f.penalty.away ?? null,
      }
      // Un proveedor que todavía no informa estadio o árbitro no debe borrar el
      // que ya teníamos: solo se actualiza cuando viene un valor.
      const { venue_id, referee, ...rest } = changing
      const updating = {
        ...rest,
        ...(venue_id ? { venue_id } : {}),
        ...(referee ? { referee } : {}),
      }
      const creating = {
        ...changing,
        league_id: league.id,
        season: f.league.season,
        timezone: f.timezone,
        home_team_id: homeTeam.id,
        away_team_id: awayTeam.id,
      }
      const select = { id: true, tournament: true, api_fixture_id: true }

      let updatedMatch
      if (this.refs.usesLegacyColumns) {
        updatedMatch = await this.prisma.matches.upsert({
          where: { api_fixture_id: f.externalId },
          select,
          update: updating,
          create: { ...creating, api_fixture_id: f.externalId },
        })
      } else {
        // Otro proveedor: el partido se busca por vínculo; si no está vinculado,
        // por local + visitante + ronda (para no duplicar uno que ya existe) y
        // recién si tampoco está, se crea sin ID de API-Football. Crear y
        // vincular van en una transacción: un partido nunca queda sin vínculo.
        const existingId =
          (await this.refs.findInternalId('MATCH', f.externalId)) ??
          (
            await this.prisma.matches.findFirst({
              where: {
                league_id: league.id,
                season: f.league.season,
                round,
                home_team_id: homeTeam.id,
                away_team_id: awayTeam.id,
              },
              select: { id: true },
            })
          )?.id

        if (existingId) {
          const linkedId = await this.refs.link(
            'MATCH',
            existingId,
            f.externalId,
          )
          if (linkedId !== existingId) {
            this.logger.warn(
              `El partido ${existingId} ya tiene otro ID en ${this.refs.providerName} (o ${f.externalId} apunta a otro partido); se saltea.`,
            )
            continue
          }
          updatedMatch = await this.prisma.matches.update({
            where: { id: existingId },
            select,
            data: updating,
          })
        } else {
          updatedMatch = await this.prisma.$transaction(async (tx) => {
            const created = await tx.matches.create({ select, data: creating })
            const linkedId = await this.refs.link(
              'MATCH',
              created.id,
              f.externalId,
              tx,
            )
            if (linkedId !== created.id) {
              // Otro proceso lo creó y vinculó antes: se descarta el duplicado.
              await tx.matches.delete({ where: { id: created.id } })
              return tx.matches.findUniqueOrThrow({
                where: { id: linkedId! },
                select,
              })
            }
            return created
          })
        }
      }

      await this.redis.redis.del(`match:details:v1:${updatedMatch.id}`)

      matchdaysToInvalidate.add(
        fixturesCacheKey(this.LEAGUE_ID, this.SEASON, tournament, matchdayKey),
      )
    }

    if (matchdaysToInvalidate.size > 0) {
      const keys = Array.from(matchdaysToInvalidate)
      await this.redis.redis.del(...keys)
      this.logger.log(`Caches invalidadas: ${keys.join(', ')}`)
    }
  }
}
