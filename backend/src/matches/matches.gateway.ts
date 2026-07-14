import { RedisService } from '../redis/redis.service'
import { ChatService } from '../chat/chat.service'
import { AuthService } from 'src/auth/auth.service'

import {
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets'

import { UseFilters, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common'
import { Server, Socket } from 'socket.io'

import { AllWsExceptionFilter } from 'src/filters/ws-exception.filter'
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard'
import { WsTimeoutGuard } from 'src/auth/guards/ws-timeout.guard'
import { RolesGuard } from 'src/auth/guards/roles.guard'
import { Roles } from 'src/auth/decorators/roles.decorator'
import { SystemRole } from '../auth/enums/roles.enum'

import { SendMatchMessageDto } from './dto/response/send-match-message.dto'

import { SanitizeMessagePipe } from 'src/pipes/sanitize-message.pipe'
import type { SocketWithUser } from 'src/auth/interfaces/active-user.interface'
import { OnApplicationBootstrap, Logger } from '@nestjs/common'
import { randomUUID } from 'crypto'

import { OnGatewayConnection, WebSocketGateway } from '@nestjs/websockets'

@UseFilters(AllWsExceptionFilter)
@WebSocketGateway()
export class MatchesGateway
  implements OnGatewayConnection, OnApplicationBootstrap {
  @WebSocketServer() server: Server

  private readonly logger = new Logger(MatchesGateway.name)

  constructor(
    private readonly redisService: RedisService,
    private readonly chatService: ChatService,
    private readonly authService: AuthService,
  ) { }

  async handleConnection(socket: Socket) {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers['authorization']

      if (!token) return

      // Si hay token, tratamos de autenticarlo
      const wsUser = await this.authService.authenticateSocket(token)
      if (wsUser) {
        socket.data.user = wsUser
      }
    } catch (error) {
      this.logger.warn(
        `Intento de conexión con token inválido en MatchesGateway: ${error.message}`,
      )
    }
  }
  async onApplicationBootstrap() {
    try {
      await this.redisService.subscribe('match_updates', (message) => {
        const update = JSON.parse(message)
        const room = `match_${update.matchId}`

        this.server.to(room).emit('match_data_update', update)

        switch (update.type) {
          case 'STATS_UPDATED':
            const { stats } = update.payload
            this.server.to(room).emit('stats_updated', {
              matchId: update.matchId,
              stats,
            })
            break

          case 'EVENTS_UPDATED':
            const { lastEvent, count } = update.payload
            this.server.to(room).emit('timeline_updated', {
              matchId: update.matchId,
              lastEvent,
              totalEvents: count,
            })

            if (lastEvent?.type === 'Goal') {
              this.server.to(room).emit('goal_scored', {
                matchId: update.matchId,
                teamId: lastEvent.team?.id,
                player: lastEvent.player?.name,
                minute: lastEvent.time?.elapsed,
              })
            }
            break

          case 'LINEUPS_READY':
            this.server.to(room).emit('lineups_updated', update.payload)
            break

          case 'MINUTE_TICK':
          case 'SCORE_UPDATED':
            this.server.to(room).emit('match_live_update', {
              matchId: update.matchId,
              type: update.type,
              h: update.payload.home_goals,
              a: update.payload.away_goals,
              status: update.payload.status,
              elapsed: update.payload.elapsed,
            })
            break
        }
      })
    } catch (error) {
      this.logger.error('Error al suscribirse a Redis en el Gateway', error)
    }
  }

  @SubscribeMessage('join_match')
  async handleJoinRoom(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ) {
    const matchId = typeof data === 'string' ? data : data.matchId

    if (!matchId) {
      throw new WsException('Falta el matchId, pa')
    }

    const room = `match_${matchId}`
    await client.join(room)
    this.logger.log(
      `✅ Cliente ${client.id} entró a la tribuna del match: ${matchId}`,
    )

    const matchKey = `chat:match:${matchId}:history`
    const matchHistory = await this.redisService.redis.lrange(matchKey, 0, -1)
    const parsedHistory = matchHistory.map((msgStr) => JSON.parse(msgStr))

    client.emit('match_chat_history', parsedHistory)
  }

  @UseGuards(WsJwtGuard, WsTimeoutGuard)
  @SubscribeMessage('send_chat_message')
  @UsePipes(new ValidationPipe({ transform: true }), new SanitizeMessagePipe())
  async handleMatchMessage(
    @MessageBody() body: SendMatchMessageDto,
    @ConnectedSocket() client: SocketWithUser,
  ) {
    const { matchId, message, stickerId, useMegaphone } = body
    const user = client.data.user

    // 1. Rate Limit
    const rate = this.chatService.checkMessageRate(user.id)
    if (!rate.allowed) {
      throw new WsException({
        code: 'RATE_LIMIT',
        message: 'Demasiados mensajes, bajá un cambio en la tribuna 😅',
        data: rate,
      })
    }

    const { finalStickerId, finalNameColor, finalBanner, isMegaphoneActive } =
      await this.chatService.processMessageAssets(
        user.id,
        body.stickerId,
        body.useMegaphone,
      )
    const profile = this.chatService.getProfileBySocketId(client.id)

    const messagePayload = {
      messageId: randomUUID(),
      matchId,
      userId: user.id,
      name: profile?.username || user.username || user.name,
      teamName: profile?.teamName,
      badgeUrl: profile?.badgeUrl,
      message: message,
      stickerId: finalStickerId,
      bannerId: finalBanner,
      nameColor: finalNameColor,
      isMegaphone: isMegaphoneActive,
      timestamp: Date.now(),
    }

    const matchKey = `chat:match:${matchId}:history`
    await this.redisService.redis.rpush(
      matchKey,
      JSON.stringify(messagePayload),
    )
    await this.redisService.redis.ltrim(matchKey, -50, -1)

    this.server.to(`match_${matchId}`).emit('on-message', messagePayload)
  }

  @UseGuards(WsJwtGuard, RolesGuard)
  @Roles(SystemRole.MODERATOR, SystemRole.ADMIN)
  @SubscribeMessage('delete_message')
  async handleDeleteMatchMessage(
    @MessageBody() data: { matchId: string; messageId: string },
    @ConnectedSocket() client: SocketWithUser,
  ) {
    const { matchId, messageId } = data

    if (!matchId || !messageId) {
      throw new WsException('El matchId y el messageId son requeridos')
    }

    // 1. Mandamos al servicio a limpiar Redis
    const deleted = await this.chatService.deleteMatchMessage(
      matchId,
      messageId,
    )

    if (!deleted) {
      throw new WsException('No se encontró el mensaje en este partido')
    }

    this.server.to(`match_${matchId}`).emit('on_message_deleted', { messageId })

    return { status: 'ok', message: 'Mensaje de partido eliminado' }
  }
}
