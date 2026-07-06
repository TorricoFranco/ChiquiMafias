import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ApiFootballHttp } from '../http/api-football.http'
import { PrismaService } from 'src/prisma/prisma.service'
import { RedisService } from 'src/redis/redis.service'
import { ApiFootballResponse } from '../interfaces/types'
import { ApiFixture } from '../interfaces/fixture'

import { FINAL_STATUSES, ACTIVE_STATUSES } from '../mappers/API_STATUSES'
import { ROUND_MAP } from '../mappers/roundTranslation'
import { LiveMatchData } from 'src/fixture/types/fixtures'

@Injectable()
export class LiveScoreCron {
  private readonly logger = new Logger(LiveScoreCron.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly http: ApiFootballHttp,
    private readonly redisService: RedisService,
  ) { }

  @Cron('*/30 * * * * *')
  async handleLiveScores() {
    try {
      const activeMatchesDb = await this.prisma.matches.findMany({
        where: { tracked: true, is_live_finished: false },
        select: {
          id: true,
          api_fixture_id: true,
          home_goals: true,
          away_goals: true,
          status_short: true,
          elapsed: true,
          home_team_id: true,
          away_team_id: true,
          league: {
            select: {
              api_league_id: true,
            },
          },
        },
      })

      if (activeMatchesDb.length === 0) {
        this.logger.log('No hay partidos activos para trackear.')
        return
      }
      const leagueId = activeMatchesDb[0]?.league.api_league_id

      const res = await this.http.get<ApiFootballResponse<ApiFixture[]>>(
        '/fixtures',
        {
          live: 'all',
          league: leagueId,
        },
      )
      const liveMatchesApi = res.data.response || []

      if (liveMatchesApi.length === 0) {
        await this.redisService.redis.del(`live_scores:league:${leagueId}`)
        return
      }

      // Reconciliación para partidos que terminaron o desaparecieron del feed live
      const missingMatches = this.reconcileMatches(
        activeMatchesDb,
        liveMatchesApi,
      )

      for (const match of missingMatches) {
        await this.syncSpecificMatch(match.id, match.api_fixture_id, leagueId)
      }

      const liveScoresHash: Record<string, string> = {}

      for (const apiMatch of liveMatchesApi) {
        const matchDb = activeMatchesDb.find(
          (m) => m.api_fixture_id === apiMatch.fixture.id,
        )

        const apiStatus = apiMatch.fixture.status.short
        const isFinished = FINAL_STATUSES.includes(apiStatus)

        if (!matchDb) continue

        const roundForDb =
          ROUND_MAP[apiMatch.league.round] ||
          apiMatch.league.round ||
          'Unknown Round'

        const liveData: LiveMatchData = {
          home_goals: apiMatch.goals.home ?? 0,
          away_goals: apiMatch.goals.away ?? 0,
          home_penalty_goals: apiMatch.score?.penalty?.home ?? null,
          away_penalty_goals: apiMatch.score?.penalty?.away ?? null,
          status_short: apiMatch.fixture.status.short,
          elapsed: apiMatch.fixture.status.elapsed,
          home_team_id: matchDb.home_team_id,
          away_team_id: matchDb.away_team_id,
          round: roundForDb,
        }
        liveScoresHash[matchDb.id] = JSON.stringify(liveData)

        const hasPenaltiesChanged = apiMatch.score?.penalty?.home !== null

        const hasScoreChanged =
          matchDb.home_goals !== (apiMatch.goals.home ?? 0) ||
          matchDb.away_goals !== (apiMatch.goals.away ?? 0)
        const hasStatusChanged =
          matchDb.status_short !== apiMatch.fixture.status.short
        const hasMinuteChanged =
          matchDb.elapsed !== apiMatch.fixture.status.elapsed

        if (
          hasScoreChanged ||
          hasStatusChanged ||
          hasMinuteChanged ||
          hasPenaltiesChanged
        ) {
          await this.prisma.matches.update({
            where: { id: matchDb.id },
            data: {
              home_goals: apiMatch.goals.home ?? 0,
              away_goals: apiMatch.goals.away ?? 0,
              status_short: apiMatch.fixture.status.short,
              home_penalty_goals: apiMatch.score?.penalty?.home ?? null,
              away_penalty_goals: apiMatch.score?.penalty?.away ?? null,
              elapsed: apiMatch.fixture.status.elapsed,
              is_live_finished: isFinished,
              tracked: !isFinished,
            },
          })

          await this.redisService.redis.del(`match:details:v1:${matchDb.id}`)

          // Notificamos por Socket
          await this.publishUpdate(
            matchDb.id,
            apiMatch,
            hasScoreChanged || hasPenaltiesChanged
              ? 'SCORE_UPDATED'
              : 'MINUTE_TICK',
          )
        }
      }

      if (Object.keys(liveScoresHash).length > 0) {
        await this.redisService.redis.hset(
          `live_scores:league:${leagueId}`,
          liveScoresHash,
        )
        await this.redisService.redis.expire(
          `live_scores:league:${leagueId}`,
          300,
        )

        await this.redisService.publish('league_live_updates', {
          leagueId: leagueId,
          matches: liveScoresHash,
        })
      }
    } catch (error) {
      this.logger.error(`Error en LiveScoreCron: ${error.message}`)
    }
  }

  private async publishUpdate(matchId: string, apiMatch: any, type: string) {
    await this.redisService.publish('match_updates', {
      matchId,
      type,
      payload: {
        home_goals: apiMatch.goals.home,
        away_goals: apiMatch.goals.away,
        home_penalty_goals: apiMatch.score?.penalty?.home ?? null,
        away_penalty_goals: apiMatch.score?.penalty?.away ?? null,
        status: apiMatch.fixture.status.short,
        elapsed: apiMatch.fixture.status.elapsed,
      },
    })
  }

  private async handleMatchCleanup(matchId: string, leagueId: number) {
    // Eliminar el partido del Hash de la liga en Redis
    await this.redisService.redis.hdel(
      `live_scores:league:${leagueId}`,
      matchId,
    )

    // Limpiar caché de detalles
    await this.redisService.redis.del(`match:details:v1:${matchId}`)

    this.logger.log(`Partido ${matchId} finalizado y limpiado de Redis.`)
  }

  private reconcileMatches(
    activeMatchesDb: any[],
    liveMatchesApi: any[],
  ): any[] {
    const apiIds = new Set(liveMatchesApi.map((m) => m.fixture.id))

    return activeMatchesDb.filter((dbMatch) => {
      const isMissing = !apiIds.has(dbMatch.api_fixture_id)
      const wasInPlay = ACTIVE_STATUSES.includes(dbMatch.status_short)

      return isMissing && wasInPlay
    })
  }

  private async syncSpecificMatch(
    matchDbId: string,
    apiFixtureId: number,
    leagueId: number,
  ) {
    try {
      const res = await this.http.get<ApiFootballResponse<ApiFixture[]>>(
        '/fixtures',
        { id: apiFixtureId },
      )

      const apiMatch = res.data.response?.[0]
      if (!apiMatch) return

      const apiStatus = apiMatch.fixture.status.short
      const isFinished = FINAL_STATUSES.includes(apiStatus)

      await this.prisma.matches.update({
        where: { id: matchDbId },
        data: {
          home_goals: apiMatch.goals.home,
          away_goals: apiMatch.goals.away,
          status_short: apiStatus,
          elapsed: apiMatch.fixture.status.elapsed,
          is_live_finished: isFinished,
          tracked: !isFinished,
        },
      })

      if (isFinished) {
        await this.handleMatchCleanup(matchDbId, leagueId)
      }

      this.logger.log(
        `Sincronización manual: Partido ${apiFixtureId} actualizado a ${apiStatus}`,
      )
    } catch (error) {
      this.logger.error(
        `Error sincronizando partido ${apiFixtureId}: ${error.message}`,
      )
    }
  }
}
