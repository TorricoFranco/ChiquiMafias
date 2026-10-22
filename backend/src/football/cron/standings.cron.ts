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

// Espera tras el final de un partido para que el proveedor actualice la tabla.
const AFTER_MATCH_DELAY_MS = 60_000

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
  // Sincronización post-partido programada por temporada. Cada final nuevo
  // reinicia la espera: si terminan siete partidos juntos se pide la tabla una
  // sola vez, un minuto después del último.
  private readonly pendingAfterMatch = new Map<string, NodeJS.Timeout>()

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
    clearTimeout(this.pendingAfterMatch.get(key))

    this.logger.log(
      `Partido terminado: se actualiza la tabla de ${payload.leagueDbId} ${payload.season} en ${AFTER_MATCH_DELAY_MS / 1000} s`,
    )

    const timer = setTimeout(() => {
      this.pendingAfterMatch.delete(key)
      void this.syncAfterMatch(payload)
    }, AFTER_MATCH_DELAY_MS)
    this.pendingAfterMatch.set(key, timer)
  }

  private async syncAfterMatch({ leagueDbId, season }: MatchFinishedEvent) {
    try {
      const competitionSeason = await this.prisma.competitionSeason.findUnique({
        where: { league_id_season: { league_id: leagueDbId, season } },
        include: { league: true },
      })
      if (
        !competitionSeason?.sync_enabled ||
        competitionSeason.standings_sync_minutes === null
      ) {
        return
      }

      const strategy = this.standingsStrategy(competitionSeason)
      if (!strategy) return

      // Cuenta como la sincronización periódica: la próxima espera su intervalo.
      await this.prisma.competitionSeason.update({
        where: { id: competitionSeason.id },
        data: { last_standings_sync_at: new Date() },
      })
      await this.syncSeason(competitionSeason, strategy)
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

  private async syncSeason(season: SyncSeason, strategy: StandingsStrategy) {
    const { league } = season

    try {
      const leagueExternalId = await this.refs.leagueExternalId(league)
      if (leagueExternalId === null) {
        this.logger.warn(
          `La liga ${league.name} no tiene ID en ${this.refs.providerName}; se saltea la tabla.`,
        )
        return
      }

      const rows = await this.provider.getStandings(
        leagueExternalId,
        season.season,
      )

      if (rows.length === 0) {
        this.logger.warn(
          `El proveedor no devolvió posiciones de ${league.name} ${season.label}`,
        )
        return
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
    } catch (error) {
      this.logger.error(
        `❌ Error StandingCron (${league.name} ${season.label}): ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }
}
