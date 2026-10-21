import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from 'src/prisma/prisma.service'
import { RedisService } from 'src/redis/redis.service'
import { FootballDataProvider } from '../football-data.provider'
import { mapStatus } from '../mappers/mapStatus'
import { fixturesCacheKey, resolveRound } from '../mappers/round'
import { upsertTeam } from '../upserts/upsert-team'
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

    const fixtures = await this.provider.getFixtures({
      leagueExternalId: this.LEAGUE_ID,
      season: this.SEASON,
      from,
      to,
    })

    this.logger.debug(`Fixtures recibidos del proveedor: ${fixtures.length}`)

    if (fixtures.length === 0) {
      this.logger.log('No fixtures found')
      return
    }

    const league = await this.prisma.leagues.findUnique({
      where: { api_league_id: this.LEAGUE_ID },
    })

    if (!league) {
      throw new Error('League not found in database')
    }

    const matchdaysToInvalidate = new Set<string>()

    for (const f of fixtures) {
      const homeTeam = await upsertTeam(this.prisma, f.home)
      const awayTeam = await upsertTeam(this.prisma, f.away)
      const venueId = await upsertVenue(this.prisma, f.venue)

      if (!homeTeam || !awayTeam) {
        this.logger.warn(
          `Saltando fixture ${f.externalId}: Datos de equipos incompletos en la API.`,
        )
        continue
      }

      const { round, tournament, matchdayKey } = resolveRound(
        f.league.round,
        'N/A',
      )

      const updatedMatch = await this.prisma.matches.upsert({
        where: { api_fixture_id: f.externalId },
        select: { id: true, tournament: true, api_fixture_id: true },
        update: {
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
        },
        create: {
          api_fixture_id: f.externalId,
          league_id: league.id,
          season: f.league.season,
          round,
          tournament,
          date: new Date(f.date),
          timestamp: f.timestamp,
          timezone: f.timezone,
          status: mapStatus(f.status.short),
          status_short: f.status.short,
          status_long: f.status.long,
          referee: f.referee ?? null,
          home_team_id: homeTeam.id,
          away_team_id: awayTeam.id,
          venue_id: venueId,
          home_goals: f.goals.home ?? 0,
          away_goals: f.goals.away ?? 0,
          elapsed: f.status.elapsed,
          home_penalty_goals: f.penalty.home ?? null,
          away_penalty_goals: f.penalty.away ?? null,
        },
      })

      await this.redis.redis.del(
        `match:details:v1:${updatedMatch.api_fixture_id}`,
      )

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
