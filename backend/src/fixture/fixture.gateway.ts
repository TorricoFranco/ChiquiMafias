import {
  WebSocketServer,
  MessageBody,
  ConnectedSocket,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'

import { RedisService } from 'src/redis/redis.service'
import { OnApplicationBootstrap, Logger } from '@nestjs/common'

import { isPlayoffRound } from './utils/match-format'

@WebSocketGateway()
export class FixtureLeagueGateway implements OnApplicationBootstrap {
  @WebSocketServer() server: Server
  private readonly logger = new Logger(FixtureLeagueGateway.name)

  constructor(private readonly redisService: RedisService) {}

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

    await this.redisService.subscribe('league_live_updates', (data) => {
      try {
        if (!data) return
        const parsed = JSON.parse(data)

        const leagueIdStr = String(parsed.leagueId).trim()
        const room = `league_${leagueIdStr}`

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
          `Emitiendo actualización para la liga ${leagueIdStr} (${room})`,
          formattedMatches,
        )

        this.server.to(room).emit('on_league_update', formattedMatches)
      } catch (error) {
        this.logger.error('Error procesando update de Redis:', error.message)
      }
    })
  }

  @SubscribeMessage('join_league')
  handleJoinLeague(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { leagueId: string },
  ) {
    client.join(`league_${data.leagueId}`)
    this.logger.log(`Client ${client.id} joined league_${data.leagueId}`)
  }

  @SubscribeMessage('leave_league')
  handleLeaveLeague(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { leagueId: string },
  ) {
    client.leave(`league_${data.leagueId}`)
  }
}
