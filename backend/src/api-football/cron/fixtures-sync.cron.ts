import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ApiFootballHttp } from '../http/api-football.http'
import { PrismaService } from 'src/prisma/prisma.service'
import { RedisService } from 'src/redis/redis.service'
import { ApiFootballResponse } from '../interfaces/types'
import { ApiFixture } from '../interfaces/fixture'
import { mapStatus } from '../mappers/mapStatus'
import { upsertTeam } from '../upserts/upsert-team'
import { upsertVenue } from '../upserts/upsert-venue'

import { ROUND_MAP } from '../mappers/roundTranslation'

@Injectable()
export class FixturesSyncCron {
  private readonly logger = new Logger(FixturesSyncCron.name)

  private readonly FROM_DAYS_AGO = 10
  private readonly DAYS_FORWARD = 7
  private readonly LEAGUE_ID = 128
  private readonly SEASON = 2026

  constructor(
    private readonly prisma: PrismaService,
    private readonly http: ApiFootballHttp,
    private readonly redis: RedisService,
  ) { }

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

    const res = await this.http.get<ApiFootballResponse<ApiFixture[]>>(
      '/fixtures',
      {
        league: this.LEAGUE_ID,
        season: this.SEASON,
        from,
        to,
      },
    )

    const fixtures = res.data.response
    console.log(`Fixtures recibidos de la API, fixtures`)

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
      const homeTeam = await upsertTeam(this.prisma, f.teams.home)
      const awayTeam = await upsertTeam(this.prisma, f.teams.away)
      const venueId = await upsertVenue(this.prisma, f.fixture.venue)

      if (!homeTeam || !awayTeam) {
        this.logger.warn(
          `Saltando fixture ${f.fixture.id}: Datos de equipos incompletos en la API.`,
        )
        continue
      }

      const rawRound = f.league.round

      const roundForDb = ROUND_MAP[rawRound] || rawRound || 'N/A'

      const tournamentForDb: string = roundForDb
        ? roundForDb.toUpperCase().includes('CLAUSURA')
          ? 'CLAUSURA'
          : 'APERTURA'
        : ''

      const parts = roundForDb.split(' - ')
      const detail = parts.length >= 2 ? parts[1].trim() : parts[0].trim()

      const isNumeric = !isNaN(Number(detail))
      const matchdayKey = isNumeric
        ? `fecha:${detail}`
        : detail.toLowerCase().replace(/\s+/g, '_')

      const cacheKey = `fixtures:128:${this.SEASON}:${tournamentForDb}:${matchdayKey}`


      //DEBUG [FixturesSyncCron] Guardando cache: , fixtures:128:2026:APERTURA:fecha:9

      const updatedMatch = await this.prisma.matches.upsert({
        where: { api_fixture_id: f.fixture.id },
        select: { id: true, tournament: true, api_fixture_id: true },
        update: {
          date: new Date(f.fixture.date),
          timestamp: f.fixture.timestamp,
          status: mapStatus(f.fixture.status.short),
          status_short: f.fixture.status.short,
          status_long: f.fixture.status.long,
          referee: f.fixture.referee ?? null,
          venue_id: venueId,
          round: roundForDb,
          tournament: tournamentForDb ?? '',
          home_goals: f.goals.home ?? 0,
          away_goals: f.goals.away ?? 0,
          elapsed: f.fixture.status.elapsed,
          // extra_time: f.fixture.status.elapsed
          home_penalty_goals: f.score.penalty.home ?? null,
          away_penalty_goals: f.score.penalty.away ?? null,
        },
        create: {
          api_fixture_id: f.fixture.id,
          league_id: league.id,
          season: f.league.season,
          round: roundForDb,
          tournament: tournamentForDb ?? '',
          date: new Date(f.fixture.date),
          timestamp: f.fixture.timestamp,
          timezone: f.fixture.timezone,
          status: mapStatus(f.fixture.status.short),
          status_short: f.fixture.status.short,
          status_long: f.fixture.status.long,
          referee: f.fixture.referee ?? null,
          home_team_id: homeTeam.id,
          away_team_id: awayTeam.id,
          venue_id: venueId,
          home_goals: f.goals.home ?? 0,
          away_goals: f.goals.away ?? 0,
          elapsed: f.fixture.status.elapsed,
          home_penalty_goals: f.score.penalty.home ?? null,
          away_penalty_goals: f.score.penalty.away ?? null,
        },
      })

      await this.redis.redis.del(
        `match:details:v1:${updatedMatch.api_fixture_id}`,
      )

      matchdaysToInvalidate.add(
        `fixtures:128:${this.SEASON}:${tournamentForDb}:${matchdayKey}`,
      )
    }

    if (matchdaysToInvalidate.size > 0) {
      const keys = Array.from(matchdaysToInvalidate)
      await this.redis.redis.del(...keys)
      this.logger.log(`Caches invalidadas: ${keys.join(', ')}`)
    }
  }
}
