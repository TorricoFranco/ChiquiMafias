import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { PrismaService } from 'src/prisma/prisma.service'
import { RedisService } from 'src/redis/redis.service'
import { FootballDataProvider } from '../football-data.provider'
import { FootballFixture } from '../football.types'

import { FINAL_STATUSES, ACTIVE_STATUSES } from '../mappers/API_STATUSES'
import { fixturesCacheKey, resolveRound } from '../mappers/round'
import { LiveMatchData } from 'src/fixture/types/fixtures'
import { EventEmitter2 } from '@nestjs/event-emitter'

// El cron corre cada 30 s; si el proveedor refresca más lento se saltean ticks.
const TICK_MS = 30_000
// Tolerancia al atraso del scheduler: media vuelta de cron.
const TICK_JITTER_MS = TICK_MS / 2

@Injectable()
export class LiveScoreCron {
  private readonly logger = new Logger(LiveScoreCron.name)
  private lastRunAt = 0

  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: FootballDataProvider,
    private readonly redisService: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron('*/30 * * * * *')
  async handleLiveScores() {
    if (this.shouldSkipTick()) return

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
          season: true,
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

      const liveMatchesApi = await this.provider.getLiveFixtures(leagueId)

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
          (m) => m.api_fixture_id === apiMatch.externalId,
        )

        const apiStatus = apiMatch.status.short
        const isFinished = FINAL_STATUSES.includes(apiStatus)

        if (!matchDb) continue

        if (isFinished) {
          await this.prisma.matches.update({
            where: { id: matchDb.id },
            data: {
              home_goals: apiMatch.goals.home ?? 0,
              away_goals: apiMatch.goals.away ?? 0,
              status_short: apiStatus,
              home_penalty_goals: apiMatch.penalty.home,
              away_penalty_goals: apiMatch.penalty.away,
              elapsed: apiMatch.status.elapsed,
              is_live_finished: true,
              tracked: false,
            },
          })

          await this.handleMatchCleanup(matchDb.id, leagueId)

          const { tournament, matchdayKey } = resolveRound(
            apiMatch.league.round,
            '',
          )

          await this.redisService.redis.del(
            fixturesCacheKey(leagueId, matchDb.season, tournament, matchdayKey),
          )

          // Actualizar los standings
          this.logger.log(
            `Partido ${matchDb.id} terminado. Solicitando actualización de Standings...`,
          )

          this.eventEmitter.emit('match.finished', {
            leagueId: leagueId,
            season: matchDb.season,
          })
          continue
        }

        const { round: roundForDb } = resolveRound(
          apiMatch.league.round,
          'Unknown Round',
        )

        const liveData: LiveMatchData = {
          home_goals: apiMatch.goals.home ?? 0,
          away_goals: apiMatch.goals.away ?? 0,
          home_penalty_goals: apiMatch.penalty.home,
          away_penalty_goals: apiMatch.penalty.away,
          status_short: apiMatch.status.short,
          elapsed: apiMatch.status.elapsed,
          home_team_id: matchDb.home_team_id,
          away_team_id: matchDb.away_team_id,
          round: roundForDb,
        }
        liveScoresHash[matchDb.id] = JSON.stringify(liveData)

        const hasPenaltiesChanged = apiMatch.penalty.home !== null

        const hasScoreChanged =
          matchDb.home_goals !== (apiMatch.goals.home ?? 0) ||
          matchDb.away_goals !== (apiMatch.goals.away ?? 0)
        const hasStatusChanged = matchDb.status_short !== apiMatch.status.short
        const hasMinuteChanged = matchDb.elapsed !== apiMatch.status.elapsed

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
              status_short: apiMatch.status.short,
              home_penalty_goals: apiMatch.penalty.home,
              away_penalty_goals: apiMatch.penalty.away,
              elapsed: apiMatch.status.elapsed,
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

  /**
   * Devuelve true si el proveedor todavía no pudo haber actualizado el marcador
   * desde la última consulta. Con API-Football (30 s) nunca saltea.
   */
  private shouldSkipTick(): boolean {
    const now = Date.now()
    const minGap = Math.max(this.provider.liveRefreshMs, TICK_MS)
    if (now - this.lastRunAt < minGap - TICK_JITTER_MS) return true
    this.lastRunAt = now
    return false
  }

  private async publishUpdate(
    matchId: string,
    apiMatch: FootballFixture,
    type: string,
  ) {
    await this.redisService.publish('match_updates', {
      matchId,
      type,
      payload: {
        home_goals: apiMatch.goals.home,
        away_goals: apiMatch.goals.away,
        home_penalty_goals: apiMatch.penalty.home,
        away_penalty_goals: apiMatch.penalty.away,
        status: apiMatch.status.short,
        elapsed: apiMatch.status.elapsed,
      },
    })
  }

  private async handleMatchCleanup(matchId: string, leagueId: number) {
    await this.redisService.redis.hdel(
      `live_scores:league:${leagueId}`,
      matchId,
    )

    // Limpiar caché de detalles
    await this.redisService.redis.del(`match:details:v1:${matchId}`)

    this.logger.log(`Partido ${matchId} finalizado y limpiado de Redis.`)
  }

  private reconcileMatches<
    T extends { api_fixture_id: number; status_short: string },
  >(activeMatchesDb: T[], liveMatchesApi: FootballFixture[]): T[] {
    const apiIds = new Set(liveMatchesApi.map((m) => m.externalId))

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
      const apiMatch = await this.provider.getFixture(apiFixtureId)
      if (!apiMatch) return

      const apiStatus = apiMatch.status.short
      const isFinished = FINAL_STATUSES.includes(apiStatus)

      await this.prisma.matches.update({
        where: { id: matchDbId },
        data: {
          home_goals: apiMatch.goals.home,
          away_goals: apiMatch.goals.away,
          status_short: apiStatus,
          elapsed: apiMatch.status.elapsed,
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
