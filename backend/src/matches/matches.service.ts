import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { RedisService } from 'src/redis/redis.service'

import { PrematchServiceApi } from 'src/football/services/prematch.api'
import { FootballRefsService } from 'src/football/services/refs.service'
import { MatchesMappers } from './matches.mappers'
import { getMatchChatState } from './utils/match-chat.util'

import {
  MatchDetailsResponseDto,
  MatchWithCompetitionResponseDto,
} from './dto/response/match-details-response.dto'
import { CompetitionsService } from 'src/competitions/competitions.service'
import { PreMatchResponseDto } from './dto/response/prematch-response.dto'
import { MatchEventResponseDto } from './dto/response/match-events-response.dto'
import { StandingsService } from 'src/standings/standings.service'

@Injectable()
export class MatchesService {
  private readonly logger = new Logger(MatchesService.name)
  private readonly CACHE_TTL = 3600
  private readonly PRE_MATCH_STALE_TTL = 7 * 24 * 60 * 60 // 7 días
  private pendingRequests = new Map<string, Promise<any>>()
  private loadingMatches = new Map<string, Promise<any>>()

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private api: PrematchServiceApi,
    private standingsService: StandingsService,
    private refs: FootballRefsService,
    private competitions: CompetitionsService,
  ) {}

  /**
   * Detalle de un partido con su competición. Solo partidos de la temporada
   * actual de su competición (ERS RF-A04): el resto da 404.
   */
  async getMatchDetailsById(
    matchId: string,
  ): Promise<MatchWithCompetitionResponseDto> {
    const match = await this.prisma.matches.findUnique({
      where: { id: matchId },
      select: { league_id: true, season: true },
    })
    const competition = match
      ? await this.competitions.findCurrentByLeagueId(match.league_id)
      : null
    if (!match || !competition || competition.season !== match.season) {
      throw new NotFoundException('Partido no encontrado')
    }

    const details = await this.getMatchDetails(
      match.league_id,
      String(match.season),
      matchId,
    )
    return {
      ...details,
      competition: {
        slug: competition.slug,
        name: competition.name,
        shortName: competition.shortName,
        neutralVenue: competition.neutralVenue,
        seasonLabel: competition.seasonLabel,
      },
    }
  }

  async getMatchDetails(
    leagueId: string,
    season: string,
    matchId: string,
  ): Promise<MatchDetailsResponseDto> {
    // v2: suma chatState y chatActive pasó a depender del estado del partido.
    const cacheKey = `match:details:v2:${matchId}`
    const cached = await this.redisService.redis.get(cacheKey)
    if (cached) return JSON.parse(cached)

    // SINGLEFLIGHT
    if (this.loadingMatches.has(matchId)) {
      this.logger.debug(
        `[Singleflight] Colgándose de petición en curso para: ${matchId}`,
      )
      return this.loadingMatches.get(matchId)
    }

    const fetchPromise = (async () => {
      try {
        const seasonNum = Number(season)

        const match = await this.prisma.matches.findUnique({
          where: { id: matchId, league_id: leagueId, season: seasonNum },
          include: {
            home_team: { include: { venue: true } },
            away_team: { include: { venue: true } },
            venue: true,
            league: {
              select: {
                id: true,
                api_league_id: true,
              },
            },
          },
        })

        if (!match) {
          throw new NotFoundException(`Match ${matchId} not found`)
        }

        // Recuperar data de live scores si existe
        const liveDataRaw = await this.redisService.redis.hget(
          `live_scores:league:${match.league.api_league_id ?? match.league.id}`,
          matchId,
        )
        if (liveDataRaw) {
          const live = JSON.parse(liveDataRaw)
          match.home_goals = live.home_goals
          match.away_goals = live.away_goals
          match.home_penalty_goals = live.home_penalty_goals
          match.away_penalty_goals = live.away_penalty_goals
          match.elapsed = live.elapsed
          match.status_short = live.status_short
        }

        const notStartedStatuses = ['TBD', 'NS', 'PST', 'CANC', 'ABD']
        const isNotStarted = notStartedStatuses.includes(match.status_short)

        const [lineup, statistics] = await Promise.all([
          match.lineup_fetched
            ? this.getLineupId(matchId).catch(() => [])
            : Promise.resolve([]),
          !isNotStarted
            ? this.getMatchStats(matchId).catch(() => [])
            : Promise.resolve([]),
        ])

        let events: any[] = []
        if (!isNotStarted) {
          events = await this.getMatchEvents(matchId).catch(() => [])
        }

        // USAMOS EL MAPPER CORREGIDO

        const liveSummary = MatchesMappers.formatSummaryFromEvents(events)

        const finalVenue = match.venue || match.home_team.venue
        const isLive = [
          '1H',
          'HT',
          '2H',
          'ET',
          'BT',
          'P',
          'LIVE',
          'PEN',
        ].includes(match.status_short)

        // OBJETO RESULT AJUSTADO AL DTO
        const result: MatchDetailsResponseDto = {
          metadata: {
            id: match.id,
            status: match.status_short,
            status_long: match.status_long,
            date: match.date,
            timestamp: match.timestamp,
            referee: match.referee ?? null, // Forzar null si es undefined
            round: match.round,
            tournament: match.tournament,
            venue: finalVenue
              ? {
                  name: finalVenue.name,
                  city: finalVenue.city ?? null, // Clave: permitir null segun DTO
                  image: finalVenue.image_url ?? null,
                }
              : null,
          },
          score: {
            home: match.home_goals ?? 0,
            away: match.away_goals ?? 0,
            home_penalties: match.home_penalty_goals ?? null,
            away_penalties: match.away_penalty_goals ?? null,
            elapsed: match.elapsed ?? 0,
            summary: liveSummary,
          },
          teams: {
            home: {
              id: match.home_team.id,
              name: match.home_team.name,
              logo: match.home_team.logo_url ?? '',
              short_code: match.home_team.short_code ?? '',
            },
            away: {
              id: match.away_team.id,
              name: match.away_team.name,
              logo: match.away_team.logo_url ?? '',
              short_code: match.away_team.short_code ?? '',
            },
          },
          lineups: lineup,
          events: events,
          stats: statistics.map((s) => ({
            ...s,
            teamLogo: s.teamLogo ?? '',
          })),
          isLive,
          // El chat depende solo del estado del partido (ERS RF-A14).
          chatState: getMatchChatState(match.status_short),
          chatActive: getMatchChatState(match.status_short) === 'OPEN',
        }

        const ttl = isLive ? 10 : 3600
        await this.redisService.redis.set(
          cacheKey,
          JSON.stringify(result),
          'EX',
          ttl,
        )

        return result
      } catch (error) {
        this.logger.error(
          `[Critical MatchDetails] ID ${matchId}: ${error.message}`,
        )
        throw error
      } finally {
        this.loadingMatches.delete(matchId)
      }
    })()

    this.loadingMatches.set(matchId, fetchPromise)
    return fetchPromise
  }

  async getLineupId(matchId: string) {
    const lineups = await this.prisma.matchLineup.findMany({
      where: { match_id: matchId },
      include: {
        team: { select: { id: true, name: true, logo_url: true } },
        players: {
          include: {
            player: { select: { id: true, name: true, photo: true } },
          },
        },
      },
    })

    return lineups.map((l) => ({
      teamId: l.team.id,
      teamName: l.team.name,
      formation: l.formation,
      kitColors: l.kit_colors,
      coach: l.coach,
      startXI: l.players
        .filter((p) => p.is_starting)
        .map((p) => ({
          id: p.player.id,
          name: p.player.name,
          number: p.number,
          pos: p.position,
          grid: p.grid,
        })),
      substitutes: l.players
        .filter((p) => !p.is_starting)
        .map((p) => ({
          id: p.player.id,
          name: p.player.name,
          number: p.number,
          pos: p.position,
        })),
    }))
  }

  async getMatchEvents(matchId: string): Promise<MatchEventResponseDto[]> {
    const events = await this.prisma.matchEvents.findMany({
      where: { match_id: matchId },
      include: {
        player: { select: { id: true, name: true, photo: true } },
        assist: { select: { id: true, name: true, photo: true } },
        team: { select: { id: true, name: true, logo_url: true } },
      },
      orderBy: { minute: 'asc' },
    })

    return events.map((event) => ({
      id: event.id,
      minute: event.minute,
      extraMinute: event.extra_minute,
      type: event.type,
      detail: event.detail,
      team: event.team,
      player: event.player,
      assist: event.assist,
      substitutionLog:
        event.type?.toLowerCase() === 'subst'
          ? {
              playerIn: event.player?.name ?? 'Jugador Entrante',
              playerOut: event.assist?.name ?? 'Jugador Saliente',
            }
          : null,
    }))
  }

  async getMatchStats(matchId: string) {
    const stats = await this.prisma.stats_team_match.findMany({
      where: { match_id: matchId },
      include: {
        team: { select: { id: true, name: true, logo_url: true } },
      },
    })

    return stats.map((s) => ({
      teamId: s.team.id,
      teamName: s.team.name,
      teamLogo: s.team.logo_url ?? '',
      statistics: s.data as any,
    }))
  }

  // PRE-MATCH AGGREGATED DATA (H2H, FORMA, STANDINGS)

  async getAggregatedData(matchId: string): Promise<PreMatchResponseDto> {
    // v2: la forma de PreMatchResponseDto cambió con el mapper nuevo.
    // Si vuelve a cambiar, subí la versión para no servir objetos viejos.
    const cacheKey = `pre_match:v2:${matchId}`
    const staleKey = `pre_match:v2:stale:${matchId}`

    // Endpoint público: sin esta lectura, cada visita hace 3 llamadas al proveedor
    const cached = await this.redisService.redis.get(cacheKey)
    if (cached) return JSON.parse(cached) as PreMatchResponseDto

    if (this.pendingRequests.has(matchId))
      return this.pendingRequests.get(matchId)

    const fetchPromise = (async () => {
      try {
        const match = await this.prisma.matches.findUnique({
          where: { id: matchId },
          include: {
            home_team: true,
            away_team: true,
          },
        })

        if (!match) throw new Error('Match no encontrado')

        const hId = String(match.home_team.id)
        const aId = String(match.away_team.id)

        // IDs de los equipos en el proveedor activo.
        const [hExternal, aExternal] = await Promise.all([
          this.refs.teamExternalId(match.home_team),
          this.refs.teamExternalId(match.away_team),
        ])
        const hIdApi = String(hExternal)
        const aIdApi = String(aExternal)
        const hasExternalIds = hExternal !== null && aExternal !== null
        const leagueId = match.league_id
        const season = match.season

        // Sin vínculo con el proveedor no hay historial ni forma; la tabla sí.
        const [h2h, hForm, aForm, standings] = await Promise.all([
          hasExternalIds ? this.api.getH2H(hIdApi, aIdApi) : [],
          hasExternalIds ? this.api.getLatestResults(hIdApi) : '',
          hasExternalIds ? this.api.getLatestResults(aIdApi) : '',
          this.standingsService.getCachedFullStandings(leagueId, season),
        ])

        const processed = MatchesMappers.toPreMatchResponse(
          { h2h, hForm, aForm, standings },
          hId,
          aId,
          hIdApi,
          aIdApi,
        )

        // Sin vínculo con el proveedor el resultado es parcial: no se cachea.
        if (!hasExternalIds) return processed

        const serialized = JSON.stringify(processed)
        await this.redisService.redis.set(
          cacheKey,
          serialized,
          'EX',
          this.CACHE_TTL,
        )
        // Copia de respaldo con TTL largo: solo se lee si el proveedor falla
        // después de que venció la key principal.
        await this.redisService.redis.set(
          staleKey,
          serialized,
          'EX',
          this.PRE_MATCH_STALE_TTL,
        )
        return processed
      } catch (error) {
        const stale = await this.redisService.redis.get(staleKey)
        if (stale) {
          this.logger.warn(
            `Pre-match ${matchId}: falló la API, se sirve la copia de respaldo`,
          )
          return JSON.parse(stale) as PreMatchResponseDto
        }
        throw error
      } finally {
        this.pendingRequests.delete(matchId)
      }
    })()

    this.pendingRequests.set(matchId, fetchPromise)
    return fetchPromise
  }
}
