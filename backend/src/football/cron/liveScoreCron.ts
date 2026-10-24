import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { Prisma } from '@prisma/client'
import { PrismaService } from 'src/prisma/prisma.service'
import { RedisService } from 'src/redis/redis.service'
import { FootballDataProvider } from '../football-data.provider'
import { FootballFixture } from '../football.types'

import { FINAL_STATUSES, ACTIVE_STATUSES } from '../mappers/API_STATUSES'
import {
  fixturesCacheKey,
  leagueCacheKey,
  matchdayKeyOf,
} from '../mappers/round'
import { LiveMatchData } from 'src/fixture/types/fixtures'
import { FootballRefsService } from '../services/refs.service'
import { matchStatusCacheKey } from 'src/matches/utils/match-chat.util'
import { EventEmitter2 } from '@nestjs/event-emitter'
import {
  LEAGUE_LIVE_UPDATES_CHANNEL,
  LeagueLiveUpdateMessage,
  MATCH_FINISHED_EVENT,
  MatchFinishedEvent,
} from '../football.events'

// El cron corre cada 30 s; si el proveedor refresca más lento se saltean ticks.
const TICK_MS = 30_000
// Tolerancia al atraso del scheduler: media vuelta de cron.
const TICK_JITTER_MS = TICK_MS / 2
// Un partido con `tracked` que empezó hace más que esto no se consulta: hay
// partidos viejos que nunca se cerraron (terminados antes de trackearse) y,
// con una consulta por competición, cada uno costaría una request por tick.
// El resultado final de esos lo sigue escribiendo `fixtures-sync`.
const LIVE_LOOKBACK_MS = 12 * 60 * 60 * 1000

const ACTIVE_MATCH_SELECT = {
  id: true,
  api_fixture_id: true,
  home_goals: true,
  away_goals: true,
  status_short: true,
  elapsed: true,
  home_team_id: true,
  away_team_id: true,
  home_team: { select: { name: true } },
  away_team: { select: { name: true } },
  season: true,
  // La ronda guardada por el sync del fixture: en formatos de eliminación no
  // se puede deducir de un partido suelto del feed en vivo.
  round: true,
  tournament: true,
  league: {
    select: {
      id: true,
      api_league_id: true,
      slug: true,
    },
  },
} satisfies Prisma.MatchesSelect

type ActiveMatch = Prisma.MatchesGetPayload<{
  select: typeof ACTIVE_MATCH_SELECT
}>
type ActiveLeague = ActiveMatch['league']

/**
 * Marcador en vivo. Los partidos activos se agrupan por competición y se
 * consulta al proveedor una vez por cada una (ERS RF-A07).
 */
@Injectable()
export class LiveScoreCron {
  private readonly logger = new Logger(LiveScoreCron.name)
  private lastRunAt = 0
  private readonly warnedWithoutId = new Set<string>()

  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: FootballDataProvider,
    private readonly redisService: RedisService,
    private readonly eventEmitter: EventEmitter2,
    private readonly refs: FootballRefsService,
  ) {}

  @Cron('*/30 * * * * *')
  async handleLiveScores() {
    if (this.shouldSkipTick()) return

    try {
      const activeMatchesDb = await this.prisma.matches.findMany({
        where: {
          tracked: true,
          is_live_finished: false,
          date: { gte: new Date(Date.now() - LIVE_LOOKBACK_MS) },
        },
        select: ACTIVE_MATCH_SELECT,
      })

      if (activeMatchesDb.length === 0) {
        this.logger.debug('No hay partidos activos para trackear.')
        return
      }

      const externalIds = await this.refs.matchExternalIds(activeMatchesDb)
      for (const m of activeMatchesDb) {
        if (!externalIds.has(m.id) && !this.warnedWithoutId.has(m.id)) {
          this.warnedWithoutId.add(m.id)
          this.logger.warn(
            `Partido activo ${m.id} sin ID en ${this.refs.providerName}: no se actualiza ni se cierra hasta vincularlo (puede tener un mercado de apuestas abierto).`,
          )
        }
      }

      const byLeague = new Map<string, ActiveMatch[]>()
      for (const m of activeMatchesDb) {
        const group = byLeague.get(m.league.id) ?? []
        group.push(m)
        byLeague.set(m.league.id, group)
      }

      // Un error en una competición no deja sin marcador a las demás.
      for (const matches of byLeague.values()) {
        const league = matches[0].league
        try {
          await this.syncLeague(league, matches, externalIds)
        } catch (error) {
          this.logger.error(
            `Error en LiveScoreCron (liga ${league.id}): ${error instanceof Error ? error.message : String(error)}`,
          )
        }
      }
    } catch (error) {
      this.logger.error(`Error en LiveScoreCron: ${error.message}`)
    }
  }

  private async syncLeague(
    league: ActiveLeague,
    activeMatchesDb: ActiveMatch[],
    externalIds: Map<string, number>,
  ) {
    // Clave estable de la liga para Redis y eventos (la de siempre).
    const leagueId = leagueCacheKey(league)
    // ID que entiende el proveedor activo.
    const leagueExternalId = await this.refs.leagueExternalId(league)
    if (leagueExternalId === null) {
      this.logger.warn(
        `La liga ${league.id} no tiene ID en ${this.refs.providerName}; se saltea el tick.`,
      )
      return
    }

    const dbByExternalId = new Map(
      activeMatchesDb.flatMap((m) => {
        const externalId = externalIds.get(m.id)
        return externalId === undefined ? [] : [[externalId, m] as const]
      }),
    )

    const liveMatchesApi = await this.provider.getLiveFixtures(leagueExternalId)

    // Reconciliación para partidos que terminaron o desaparecieron del feed live.
    // Va antes de mirar si el feed está vacío: API-Football saca del feed el
    // partido que terminó, y si era el último de la competición nunca se cerraba.
    const missingMatches = this.reconcileMatches(
      activeMatchesDb,
      liveMatchesApi,
      externalIds,
    )

    for (const match of missingMatches) {
      await this.syncSpecificMatch(match, externalIds.get(match.id)!, leagueId)
    }

    if (liveMatchesApi.length === 0) {
      await this.redisService.redis.del(`live_scores:league:${leagueId}`)
      return
    }

    const liveScoresHash: Record<string, string> = {}
    // Partidos cuyo detalle cacheado quedó viejo en este tick.
    const changedMatchIds: string[] = []

    for (const apiMatch of liveMatchesApi) {
      const matchDb = dbByExternalId.get(apiMatch.externalId)

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

        this.logLive(matchDb, apiMatch, 'terminó')
        await this.handleMatchCleanup(matchDb.id, leagueId)

        // Avisa al front que terminó: cierra el chat y recarga el partido.
        await this.publishUpdate(matchDb.id, apiMatch, 'MATCH_ENDED')
        await this.notifyFinished(matchDb, leagueId)
        continue
      }

      const liveData: LiveMatchData = {
        home_goals: apiMatch.goals.home ?? 0,
        away_goals: apiMatch.goals.away ?? 0,
        home_penalty_goals: apiMatch.penalty.home,
        away_penalty_goals: apiMatch.penalty.away,
        status_short: apiMatch.status.short,
        elapsed: apiMatch.status.elapsed,
        home_team_id: matchDb.home_team_id,
        away_team_id: matchDb.away_team_id,
        round: matchDb.round,
      }
      liveScoresHash[matchDb.id] = JSON.stringify(liveData)

      const hasPenaltiesChanged = apiMatch.penalty.home !== null

      const hasScoreChanged =
        matchDb.home_goals !== (apiMatch.goals.home ?? 0) ||
        matchDb.away_goals !== (apiMatch.goals.away ?? 0)
      const hasStatusChanged = matchDb.status_short !== apiMatch.status.short
      const hasMinuteChanged = matchDb.elapsed !== apiMatch.status.elapsed

      if (hasScoreChanged || hasStatusChanged) {
        this.logLive(
          matchDb,
          apiMatch,
          hasScoreChanged ? 'cambió el marcador' : 'cambió el estado',
        )
      }

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

        changedMatchIds.push(matchDb.id)
        await this.redisService.redis.del(
          `match:details:v2:${matchDb.id}`,
          // El chat consulta el estado con esta caché: se abre o se pausa ya.
          matchStatusCacheKey(matchDb.id),
        )

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

      // El detalle del partido pisa el marcador con este hash. Un pedido que
      // llegó entre el aviso y el hset (por ejemplo el refetch del front al
      // recibir un gol) lo armó con el marcador del tick anterior y lo dejó
      // cacheado: se borra otra vez ahora que el hash está al día.
      if (changedMatchIds.length > 0) {
        await this.redisService.redis.del(
          ...changedMatchIds.map((id) => `match:details:v2:${id}`),
        )
      }

      const update: LeagueLiveUpdateMessage = {
        leagueId,
        slug: league.slug,
        matches: liveScoresHash,
      }
      await this.redisService.publish(LEAGUE_LIVE_UPDATES_CHANNEL, update)
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

  /** `[VIVO] Boca 1-0 River · 2H 70' (cambió el marcador)` */
  private logLive(
    matchDb: ActiveMatch,
    apiMatch: FootballFixture,
    note: string,
  ) {
    const penalties =
      apiMatch.penalty.home !== null
        ? ` (pen. ${apiMatch.penalty.home}-${apiMatch.penalty.away})`
        : ''
    const elapsed =
      apiMatch.status.elapsed !== null ? ` ${apiMatch.status.elapsed}'` : ''
    this.logger.log(
      `[VIVO] ${matchDb.home_team.name} ${apiMatch.goals.home ?? 0}-${apiMatch.goals.away ?? 0} ${matchDb.away_team.name}${penalties} · ${apiMatch.status.short}${elapsed} (${note}) [${matchDb.league.slug} ${matchDb.id}]`,
    )
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

  /** Invalida la fecha del fixture y pide la tabla de su competición. */
  private async notifyFinished(
    matchDb: ActiveMatch,
    leagueId: number | string,
  ) {
    await this.redisService.redis.del(
      fixturesCacheKey(
        leagueId,
        matchDb.season,
        matchDb.tournament,
        matchdayKeyOf(matchDb.round),
      ),
    )

    this.logger.log(
      `Partido ${matchDb.id} terminado. Solicitando actualización de Standings...`,
    )

    const event: MatchFinishedEvent = {
      leagueId,
      leagueDbId: matchDb.league.id,
      season: matchDb.season,
    }
    this.eventEmitter.emit(MATCH_FINISHED_EVENT, event)
  }

  private async handleMatchCleanup(matchId: string, leagueId: number | string) {
    await this.redisService.redis.hdel(
      `live_scores:league:${leagueId}`,
      matchId,
    )

    // Limpiar caché de detalles y del estado que consulta el chat
    await this.redisService.redis.del(
      `match:details:v2:${matchId}`,
      matchStatusCacheKey(matchId),
    )

    this.logger.log(`Partido ${matchId} finalizado y limpiado de Redis.`)
  }

  private reconcileMatches(
    activeMatchesDb: ActiveMatch[],
    liveMatchesApi: FootballFixture[],
    externalIds: Map<string, number>,
  ): ActiveMatch[] {
    const apiIds = new Set(liveMatchesApi.map((m) => m.externalId))

    return activeMatchesDb.filter((dbMatch) => {
      const externalId = externalIds.get(dbMatch.id)
      // Sin ID en el proveedor no se puede consultar: se deja para el próximo tick.
      if (externalId === undefined) return false

      const isMissing = !apiIds.has(externalId)
      const wasInPlay = ACTIVE_STATUSES.includes(dbMatch.status_short)

      return isMissing && wasInPlay
    })
  }

  private async syncSpecificMatch(
    matchDb: ActiveMatch,
    apiFixtureId: number,
    leagueId: number | string,
  ) {
    try {
      const apiMatch = await this.provider.getFixture(apiFixtureId)
      if (!apiMatch) {
        this.logger.warn(
          `[VIVO] El partido ${matchDb.id} salió del feed y el proveedor no lo encuentra por id (${apiFixtureId})`,
        )
        return
      }

      const apiStatus = apiMatch.status.short
      const isFinished = FINAL_STATUSES.includes(apiStatus)

      await this.prisma.matches.update({
        where: { id: matchDb.id },
        data: {
          home_goals: apiMatch.goals.home ?? 0,
          away_goals: apiMatch.goals.away ?? 0,
          status_short: apiStatus,
          home_penalty_goals: apiMatch.penalty.home,
          away_penalty_goals: apiMatch.penalty.away,
          elapsed: apiMatch.status.elapsed,
          is_live_finished: isFinished,
          tracked: !isFinished,
        },
      })

      if (isFinished) {
        await this.handleMatchCleanup(matchDb.id, leagueId)
      } else {
        await this.redisService.redis.del(
          `match:details:v2:${matchDb.id}`,
          matchStatusCacheKey(matchDb.id),
        )
      }

      // El front se entera del estado nuevo (fin, suspensión) y ajusta el chat.
      await this.publishUpdate(
        matchDb.id,
        apiMatch,
        isFinished ? 'MATCH_ENDED' : 'MINUTE_TICK',
      )

      // Igual que un final visto en el feed: fecha del fixture y tabla.
      if (isFinished) await this.notifyFinished(matchDb, leagueId)

      // Solo lo que cambió: un partido que el feed en vivo no trae se consulta
      // en cada tick y no tiene que llenar la consola.
      const changed =
        isFinished ||
        apiStatus !== matchDb.status_short ||
        (apiMatch.goals.home ?? 0) !== matchDb.home_goals ||
        (apiMatch.goals.away ?? 0) !== matchDb.away_goals
      if (changed) {
        this.logLive(matchDb, apiMatch, 'salió del feed, consultado por id')
      } else {
        this.logger.debug(
          `[VIVO] Partido ${matchDb.id} fuera del feed en vivo, sigue en ${apiStatus}`,
        )
      }
    } catch (error) {
      this.logger.error(
        `Error sincronizando partido ${apiFixtureId}: ${error.message}`,
      )
    }
  }
}
