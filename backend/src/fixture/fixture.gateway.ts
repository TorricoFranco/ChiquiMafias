import {
  WebSocketServer,
  MessageBody,
  ConnectedSocket,
  SubscribeMessage,
  WebSocketGateway,
  WsException,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'

import { RedisService } from 'src/redis/redis.service'
import { OnApplicationBootstrap, Logger, UseFilters } from '@nestjs/common'

import { isPlayoffRound } from './utils/match-format'
import { competitionRoom, legacyLeagueRoom } from './utils/league-rooms'
import { CompetitionsService } from 'src/competitions/competitions.service'
import { AllWsExceptionFilter } from 'src/filters/ws-exception.filter'
import {
  LEAGUE_LIVE_UPDATES_CHANNEL,
  LeagueLiveUpdateMessage,
} from 'src/football/football.events'

@UseFilters(AllWsExceptionFilter)
@WebSocketGateway()
export class FixtureLeagueGateway implements OnApplicationBootstrap {
  @WebSocketServer() server: Server
  private readonly logger = new Logger(FixtureLeagueGateway.name)

  constructor(
    private readonly redisService: RedisService,
    private readonly competitions: CompetitionsService,
  ) {}

  async onApplicationBootstrap() {
    let retries = 0
    while (!this.redisService && retries < 5) {
      await new Promise((resolve) => setTimeout(resolve, 500))
      retries++
    }

    if (!this.redisService) {
      this.logger.error(
        'RedisService sigue siendo undefined después de los reintentos',
      )
      return
    }

    await this.redisService.subscribe(LEAGUE_LIVE_UPDATES_CHANNEL, (data) => {
      try {
        if (!data) return
        const parsed = JSON.parse(data) as LeagueLiveUpdateMessage

        const leagueIdStr = String(parsed.leagueId).trim()
        // Una sola emisión a las dos salas: el que está en ambas lo recibe una vez.
        const rooms = [legacyLeagueRoom(leagueIdStr)]
        if (parsed.slug) rooms.push(competitionRoom(parsed.slug))

        if (!this.server) {
          this.logger.error('WebSocket Server no inicializado')
          return
        }
        const formattedMatches = {}
        Object.entries(parsed.matches).forEach(([matchId, matchDataRaw]) => {
          const match =
            typeof matchDataRaw === 'string'
              ? JSON.parse(matchDataRaw)
              : matchDataRaw

          formattedMatches[matchId] = {
            h: Number(match.home_goals),
            a: Number(match.away_goals),
            hp: Number(match.home_penalty_goals || 0),
            ap: Number(match.away_penalty_goals || 0),
            homeTeamId: match.home_team_id,
            awayTeamId: match.away_team_id,
            status: match.status_short,
            elapsed: Number(match.elapsed),
            isLive: true,

            isPlayoff: isPlayoffRound(match.round || ''),
          }
        })

        this.logger.debug(
          `Emitiendo actualización para la liga ${leagueIdStr} (${rooms.join(', ')})`,
          formattedMatches,
        )

        this.server.to(rooms).emit('on_league_update', formattedMatches)
      } catch (error) {
        this.logger.error('Error procesando update de Redis:', error.message)
      }
    })
  }

  /**
   * Marcadores en vivo de una competición. Solo se entra a la sala de una
   * competición que existe y tiene temporada actual (ERS RNF-S03).
   */
  @SubscribeMessage('join_competition')
  async handleJoinCompetition(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { slug?: unknown },
  ) {
    const slug = typeof data?.slug === 'string' ? data.slug : ''
    try {
      await this.competitions.resolveCurrent(slug)
    } catch {
      throw new WsException({
        code: 'COMPETITION_NOT_FOUND',
        message: 'Competición no encontrada',
      })
    }
    await client.join(competitionRoom(slug))
    this.logger.debug(`Cliente ${client.id} entró a ${competitionRoom(slug)}`)
    return { status: 'ok' }
  }

  @SubscribeMessage('leave_competition')
  async handleLeaveCompetition(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { slug?: unknown },
  ) {
    if (typeof data?.slug !== 'string') return
    await client.leave(competitionRoom(data.slug))
  }

  /** Alias de `join_competition` por clave de Redis (`'128'`), con la misma validación. */
  @SubscribeMessage('join_league')
  async handleJoinLeague(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { leagueId?: unknown },
  ) {
    const leagueKey =
      typeof data?.leagueId === 'string' || typeof data?.leagueId === 'number'
        ? String(data.leagueId)
        : ''
    const competition = leagueKey
      ? await this.competitions.findCurrentByCacheKey(leagueKey)
      : null
    if (!competition) {
      throw new WsException({
        code: 'COMPETITION_NOT_FOUND',
        message: 'Competición no encontrada',
      })
    }
    await client.join(legacyLeagueRoom(leagueKey))
    this.logger.debug(
      `Cliente ${client.id} entró a ${legacyLeagueRoom(leagueKey)}`,
    )
    return { status: 'ok' }
  }

  @SubscribeMessage('leave_league')
  async handleLeaveLeague(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { leagueId?: unknown },
  ) {
    if (
      typeof data?.leagueId !== 'string' &&
      typeof data?.leagueId !== 'number'
    )
      return
    await client.leave(legacyLeagueRoom(data.leagueId))
  }
}
