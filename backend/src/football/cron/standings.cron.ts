import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { OnEvent } from '@nestjs/event-emitter'

import { FootballDataProvider } from '../football-data.provider'

import { PrismaService } from 'src/prisma/prisma.service'
import { RedisService } from 'src/redis/redis.service'
import { StandingsService } from 'src/standings/standings.service'

import { MATCH_FINISHED_EVENT } from '../football.events'
import type { MatchFinishedEvent } from '../football.events'
import { CompetitionFormatStrategy } from '../formats/format-strategy'
import { getFormatStrategy } from '../formats/format-registry'
import { FootballRefsService } from '../services/refs.service'
import { upsertTeamSeasonStats } from '../upserts/upsert-teamSeasonStats'
import { isSyncDue, SyncSeason } from './competition-sync'

// Esperas tras el final de un partido para que el proveedor actualice la tabla.
// Highlightly tarda más de un minuto (a los 20 minutos de un final todavía
// devolvía la tabla vieja), así que se reintenta mientras no la haya cambiado.
const AFTER_MATCH_DELAYS_MS = [60_000, 5 * 60_000, 15 * 60_000, 30 * 60_000]

/** Reintentos pendientes de una temporada tras un final. */
interface AfterMatchRetries {
  timers: NodeJS.Timeout[]
  /** Partidos jugados que sumaba la tabla guardada cuando terminó el partido. */
  baseline: Promise<number | null>
}

type StandingsStrategy = CompetitionFormatStrategy &
  Required<Pick<CompetitionFormatStrategy, 'mapStandingGroup'>>

/**
 * Sincroniza la tabla de cada temporada con `sync_enabled` y
 * `standings_sync_minutes`, cada una con su frecuencia (ERS RF-A06), y la de
 * la competición de un partido apenas termina.
 */
@Injectable()
export class StandingCron {
  private readonly logger = new Logger(StandingCron.name)
  // Sincronizaciones post-partido programadas por temporada. Cada final nuevo
  // reinicia las esperas: si terminan siete partidos juntos se pide la tabla una
  // sola vez, un minuto después del último.
  private readonly pendingAfterMatch = new Map<string, AfterMatchRetries>()

  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: FootballDataProvider,
    private readonly redis: RedisService,
    private readonly standings: StandingsService,
    private readonly refs: FootballRefsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async fetchStandings() {
    const now = new Date()

    try {
      const seasons = await this.prisma.competitionSeason.findMany({
        where: { sync_enabled: true, standings_sync_minutes: { not: null } },
        include: { league: true },
      })

      for (const season of seasons) {
        if (
          !isSyncDue(
            season.last_standings_sync_at,
            season.standings_sync_minutes!,
            now,
          )
        ) {
          continue
        }

        const strategy = this.standingsStrategy(season)
        if (!strategy) continue

        // Reclamo: si otro tick ya la tomó, la fecha leída cambió y no se
        // escribe nada.
        const claimed = await this.prisma.competitionSeason.updateMany({
          where: {
            id: season.id,
            last_standings_sync_at: season.last_standings_sync_at,
          },
          data: { last_standings_sync_at: now },
        })
        if (claimed.count === 0) continue

        await this.syncSeason(season, strategy)
      }
    } catch (error) {
      this.logger.error(
        `Error en StandingCron: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  @OnEvent(MATCH_FINISHED_EVENT)
  handleMatchFinished(payload: MatchFinishedEvent) {
    const key = `${payload.leagueDbId}:${payload.season}`
    this.cancelRetries(key, undefined)

    this.logger.log(
      `Partido terminado: se actualiza la tabla de ${payload.leagueDbId} ${payload.season} en ${AFTER_MATCH_DELAYS_MS[0] / 1000} s (y se reintenta hasta ${AFTER_MATCH_DELAYS_MS[AFTER_MATCH_DELAYS_MS.length - 1] / 60_000} min si el proveedor todavía no la cambió)`,
    )

    // Cada final recalcula la base: espera que la tabla suba por encima de lo
    // que ya tenía guardada, no de lo que tenía al primer final de la tanda.
    const baseline = this.playedTotal(payload.leagueDbId, payload.season).catch(
      (error: unknown) => {
        this.logger.warn(
          `No se pudo leer la tabla guardada antes de reintentar: ${error instanceof Error ? error.message : String(error)}`,
        )
        return null
      },
    )
    const retries: AfterMatchRetries = { timers: [], baseline }
    retries.timers = AFTER_MATCH_DELAYS_MS.map((delay, index) =>
      setTimeout(() => {
        void this.syncAfterMatch(payload, retries, index)
      }, delay),
    )
    this.pendingAfterMatch.set(key, retries)
  }

  /**
   * Cancela los reintentos pendientes. Con `only`, solo si la tanda sigue
   * siendo esa: un intento viejo en curso no cancela la que armó un final nuevo.
   */
  private cancelRetries(key: string, only?: AfterMatchRetries) {
    const pending = this.pendingAfterMatch.get(key)
    if (!pending || (only && pending !== only)) return
    pending.timers.forEach((timer) => clearTimeout(timer))
    this.pendingAfterMatch.delete(key)
  }

  /** Suma de partidos jugados de la tabla guardada: sube cuando el proveedor suma un resultado. */
  private async playedTotal(leagueId: string, season: number) {
    const total = await this.prisma.teamSeasonStats.aggregate({
      where: { league_id: leagueId, season },
      _sum: { matches_played: true },
    })
    return total._sum.matches_played ?? 0
  }

  private async syncAfterMatch(
    { leagueDbId, season }: MatchFinishedEvent,
    retries: AfterMatchRetries,
    attempt: number,
  ) {
    const key = `${leagueDbId}:${season}`
    const baselinePromise = retries.baseline
    const isLast = attempt === AFTER_MATCH_DELAYS_MS.length - 1
    try {
      const competitionSeason = await this.prisma.competitionSeason.findUnique({
        where: { league_id_season: { league_id: leagueDbId, season } },
        include: { league: true },
      })
      if (
        !competitionSeason?.sync_enabled ||
        competitionSeason.standings_sync_minutes === null
      ) {
        this.cancelRetries(key, retries)
        return
      }

      const strategy = this.standingsStrategy(competitionSeason)
      if (!strategy) {
        this.cancelRetries(key, retries)
        return
      }

      const name = `${competitionSeason.league.name} ${competitionSeason.label}`
      const baseline = await baselinePromise

      // La sincronización periódica ya puede haberla actualizado entre medio.
      if (baseline !== null) {
        const stored = await this.playedTotal(leagueDbId, season)
        if (stored > baseline) {
          this.logger.debug(
            `Tabla de ${name}: ya incluye el resultado (partidos jugados ${baseline} → ${stored}); no hace falta reintentar.`,
          )
          this.cancelRetries(key, retries)
          return
        }
      }

      // Cuenta como la sincronización periódica: la próxima espera su intervalo.
      await this.prisma.competitionSeason.update({
        where: { id: competitionSeason.id },
        data: { last_standings_sync_at: new Date() },
      })
      const synced = await this.syncSeason(competitionSeason, strategy)

      // Sin referencia para comparar no se puede saber si cambió: una sola vez.
      if (baseline === null) {
        this.cancelRetries(key, retries)
        return
      }

      const stored = synced ? await this.playedTotal(leagueDbId, season) : null
      if (stored !== null && stored > baseline) {
        this.logger.log(
          `Tabla de ${name} actualizada con el resultado (partidos jugados ${baseline} → ${stored}, intento ${attempt + 1} de ${AFTER_MATCH_DELAYS_MS.length}).`,
        )
        this.cancelRetries(key, retries)
        return
      }

      if (isLast) {
        this.logger.warn(
          `Tabla de ${name}: el proveedor sigue sin incluir el partido terminado después de ${AFTER_MATCH_DELAYS_MS[attempt] / 60_000} min (partidos jugados ${stored ?? baseline}); la sincronización periódica la actualizará.`,
        )
        this.cancelRetries(key, retries)
        return
      }

      const nextIn =
        (AFTER_MATCH_DELAYS_MS[attempt + 1] - AFTER_MATCH_DELAYS_MS[attempt]) /
        60_000
      this.logger.warn(
        `Tabla de ${name}: el proveedor todavía no incluye el partido terminado (partidos jugados ${stored ?? baseline}, esperaba más que ${baseline}); se reintenta en ${nextIn} min.`,
      )
    } catch (error) {
      this.logger.error(
        `Error actualizando la tabla tras el partido: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  private standingsStrategy(season: SyncSeason): StandingsStrategy | null {
    const strategy = getFormatStrategy(season.format)
    return strategy?.mapStandingGroup ? (strategy as StandingsStrategy) : null
  }

  /** Devuelve true si guardó la tabla del proveedor. */
  private async syncSeason(
    season: SyncSeason,
    strategy: StandingsStrategy,
  ): Promise<boolean> {
    const { league } = season

    try {
      const leagueExternalId = await this.refs.leagueExternalId(league)
      if (leagueExternalId === null) {
        this.logger.warn(
          `La liga ${league.name} no tiene ID en ${this.refs.providerName}; se saltea la tabla.`,
        )
        return false
      }

      const rows = await this.provider.getStandings(
        leagueExternalId,
        season.season,
      )

      if (rows.length === 0) {
        this.logger.warn(
          `El proveedor no devolvió posiciones de ${league.name} ${season.label}`,
        )
        return false
      }

      for (const s of rows) {
        const team = await this.refs.resolveTeam(this.prisma, s.team)

        if (!team) {
          this.logger.warn(
            `No se pudo upsertar el equipo ${s.team.externalId} - ${s.team.name}`,
          )
          continue
        }

        const { stage, groupName } = strategy.mapStandingGroup(s.group)

        await upsertTeamSeasonStats(
          this.prisma,
          {
            leagueId: league.id,
            season: season.season,
            stage: stage,
            teamId: team.id,
          },
          s,
          groupName,
        )
      }

      const cacheKey = `standings:${league.id}:${season.season}`

      const fullStandings = await this.standings.calculateFullStandings(
        league.id,
        season.season,
      )

      await this.redis.redis.set(
        cacheKey,
        JSON.stringify(fullStandings),
        'EX',
        3600,
      )
      this.logger.debug(
        `✅ Tabla de ${league.name} ${season.label} actualizada y caché limpia`,
      )
      return true
    } catch (error) {
      this.logger.error(
        `❌ Error StandingCron (${league.name} ${season.label}): ${error instanceof Error ? error.message : String(error)}`,
      )
      return false
    }
  }
}
