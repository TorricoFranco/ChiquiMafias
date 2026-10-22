import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from 'src/prisma/prisma.service'
import { RedisService } from 'src/redis/redis.service'
import { FootballDataProvider } from '../football-data.provider'
import { FootballFixture } from '../football.types'
import { CompetitionFormatStrategy } from '../formats/format-strategy'
import { getFormatStrategy } from '../formats/format-registry'
import { mapStatus } from '../mappers/mapStatus'
import {
  fixturesCacheKey,
  leagueCacheKey,
  ResolvedRound,
} from '../mappers/round'
import { FootballRefsService } from '../services/refs.service'
import { upsertVenue } from '../upserts/upsert-venue'
import { isSyncDue, SyncSeason } from './competition-sync'

/**
 * Sincroniza el fixture de cada temporada con `sync_enabled`, cada una con su
 * frecuencia (`fixtures_sync_minutes`). Corre cada minuto y solo llama al
 * proveedor por las temporadas a las que les toca (ERS RF-A06).
 */
@Injectable()
export class FixturesSyncCron {
  private readonly logger = new Logger(FixturesSyncCron.name)
  private readonly warnedWithoutStrategy = new Set<string>()

  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: FootballDataProvider,
    private readonly redis: RedisService,
    private readonly refs: FootballRefsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handle() {
    const now = new Date()

    try {
      const seasons = await this.prisma.competitionSeason.findMany({
        where: { sync_enabled: true },
        include: { league: true },
      })

      for (const season of seasons) {
        if (
          !isSyncDue(
            season.last_fixtures_sync_at,
            season.fixtures_sync_minutes,
            now,
          )
        ) {
          continue
        }

        const strategy = getFormatStrategy(season.format)
        if (!strategy) {
          this.warnWithoutStrategy(season)
          continue
        }

        // Reclamo: si otro tick ya la tomó, la fecha leída cambió y no se
        // escribe nada. Así dos corridas no sincronizan la misma temporada.
        const claimed = await this.prisma.competitionSeason.updateMany({
          where: {
            id: season.id,
            last_fixtures_sync_at: season.last_fixtures_sync_at,
          },
          data: { last_fixtures_sync_at: now },
        })
        if (claimed.count === 0) continue

        try {
          await this.syncSeason(season, strategy, now)
        } catch (error) {
          this.logger.error(
            `Error sincronizando el fixture de ${season.league.name} ${season.label}: ${error instanceof Error ? error.message : String(error)}`,
          )
        }
      }
    } catch (error) {
      this.logger.error(
        `Error en FixturesSyncCron: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  private async syncSeason(
    season: SyncSeason,
    strategy: CompetitionFormatStrategy,
    now: Date,
  ) {
    const { league } = season
    const leagueExternalId = await this.refs.leagueExternalId(league)
    if (leagueExternalId === null) {
      this.logger.warn(
        `La liga ${league.name} no tiene ID en ${this.refs.providerName}; se saltea la sincronización.`,
      )
      return
    }

    const fixtures = await this.provider.getFixtures({
      leagueExternalId,
      season: season.season,
      ...strategy.fixturesWindow(now),
    })

    this.logger.debug(
      `Fixtures recibidos de ${league.name} ${season.label}: ${fixtures.length}`,
    )

    if (fixtures.length === 0) return

    const rounds = strategy.resolveRounds(fixtures)
    const leagueKey = leagueCacheKey(league)
    const matchdaysToInvalidate = new Set<string>()

    for (const [index, f] of fixtures.entries()) {
      try {
        const { tournament, matchdayKey } = rounds[index]
        const synced = await this.syncFixture(season, f, rounds[index])
        if (!synced) continue

        matchdaysToInvalidate.add(
          fixturesCacheKey(leagueKey, season.season, tournament, matchdayKey),
        )
      } catch (error) {
        this.logger.error(
          `Error sincronizando el fixture ${f.externalId}: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }

    if (matchdaysToInvalidate.size > 0) {
      const keys = Array.from(matchdaysToInvalidate)
      await this.redis.redis.del(...keys)
      this.logger.debug(`Caches invalidadas: ${keys.join(', ')}`)
    }
  }

  /** Crea o actualiza el partido. Devuelve false si se salteó. */
  private async syncFixture(
    season: SyncSeason,
    f: FootballFixture,
    { round, tournament }: ResolvedRound,
  ): Promise<boolean> {
    const { league } = season
    const homeTeam = await this.refs.resolveTeam(this.prisma, f.home)
    const awayTeam = await this.refs.resolveTeam(this.prisma, f.away)
    const venueId = await upsertVenue(this.prisma, f.venue)

    if (!homeTeam || !awayTeam) {
      this.logger.warn(
        `Saltando fixture ${f.externalId}: equipo incompleto o sin vincular.`,
      )
      return false
    }

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

    let updatedMatch: { id: string }
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
        const linkedId = await this.refs.link('MATCH', existingId, f.externalId)
        if (linkedId !== existingId) {
          this.logger.warn(
            `El partido ${existingId} ya tiene otro ID en ${this.refs.providerName} (o ${f.externalId} apunta a otro partido); se saltea.`,
          )
          return false
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

    await this.redis.redis.del(`match:details:v2:${updatedMatch.id}`)
    return true
  }

  private warnWithoutStrategy(season: SyncSeason) {
    if (this.warnedWithoutStrategy.has(season.id)) return
    this.warnedWithoutStrategy.add(season.id)
    this.logger.warn(
      `${season.league.name} ${season.label} tiene el formato ${season.format}, que todavía no se sincroniza; se saltea.`,
    )
  }
}
