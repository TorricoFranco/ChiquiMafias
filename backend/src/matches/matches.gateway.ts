import { RedisService } from '../redis/redis.service'
import { PrismaService } from '../prisma/prisma.service'
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

import { SendMatchMessageDto } from './dto/response/send-match-message.dto'

import { SanitizeMessagePipe } from 'src/pipes/sanitize-message.pipe'
import type { SocketWithUser } from 'src/auth/interfaces/active-user.interface'
import { OnApplicationBootstrap, Logger } from '@nestjs/common'
import { randomUUID } from 'crypto'

import { OnGatewayConnection, WebSocketGateway } from '@nestjs/websockets'
import {
  getMatchChatState,
  isMatchChatOpen,
  MATCH_STATUS_CACHE_TTL_SECONDS,
  matchStatusCacheKey,
} from './utils/match-chat.util'
import {
  BotWireEvent,
  botReactionTo,
  goalMessage,
  shootoutMissMessage,
} from './utils/match-bot.util'

@UseFilters(AllWsExceptionFilter)
@WebSocketGateway()
export class MatchesGateway
  implements OnGatewayConnection, OnApplicationBootstrap
{
  @WebSocketServer() server: Server

  private readonly logger = new Logger(MatchesGateway.name)

  constructor(
    private readonly redisService: RedisService,
    private readonly chatService: ChatService,
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

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
        // Acá no hay filtro de Nest: un error no tiene que salir del callback.
        try {
          this.handleMatchUpdate(message)
        } catch (error) {
          this.logger.error(
            `Error procesando match_updates: ${error instanceof Error ? error.message : String(error)}`,
          )
        }
      })
    } catch (error) {
      this.logger.error('Error al suscribirse a Redis en el Gateway', error)
    }
  }

  private handleMatchUpdate(message: string) {
    const update = JSON.parse(message)
    const room = `match_${update.matchId}`

    this.server.to(room).emit('match_data_update', update)

    switch (update.type) {
      case 'STATS_UPDATED': {
        const { stats } = update.payload
        this.server.to(room).emit('stats_updated', {
          matchId: update.matchId,
          stats,
        })
        break
      }

      case 'EVENTS_UPDATED': {
        const { lastEvent, count } = update.payload
        this.server.to(room).emit('timeline_updated', {
          matchId: update.matchId,
          lastEvent,
          totalEvents: count,
        })

        // `newEvents` trae todos los eventos nuevos del tick (en la tanda
        // caen dos tiros por minuto). Un aviso sin ese campo solo trae el último.
        const newEvents: BotWireEvent[] =
          update.payload.newEvents ?? (lastEvent ? [lastEvent] : [])
        for (const event of newEvents) {
          this.reactToEvent(update.matchId, event)
        }
        break
      }

      case 'LINEUPS_READY':
        this.server.to(room).emit('lineups_updated', update.payload)
        break

      case 'MINUTE_TICK':
      case 'SCORE_UPDATED':
      case 'MATCH_ENDED': {
        const chatState = getMatchChatState(String(update.payload.status))
        this.server.to(room).emit('match_live_update', {
          matchId: update.matchId,
          type: update.type,
          h: update.payload.home_goals,
          a: update.payload.away_goals,
          // Marcador de la tanda; null si el partido no fue a penales.
          hp: update.payload.home_penalty_goals ?? null,
          ap: update.payload.away_penalty_goals ?? null,
          status: update.payload.status,
          elapsed: update.payload.elapsed,
          chatState,
          chatActive: chatState === 'OPEN',
        })
        break
      }
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

  /**
   * El front lo emite al salir de un partido. Sin esto el socket compartido
   * quedaba en todas las salas visitadas y recibía eventos de otros partidos.
   */
  @SubscribeMessage('leave_match')
  async handleLeaveRoom(
    @MessageBody() data: string | { matchId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const matchId = typeof data === 'string' ? data : data?.matchId
    if (!matchId) return

    await client.leave(`match_${matchId}`)
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

    const matchStatus = await this.getMatchStatus(matchId)

    if (!isMatchChatOpen(matchStatus)) {
      throw new WsException({
        code: 'MATCH_INACTIVE',
        message: 'El partido no está activo, la tribuna está cerrada 🛑',
      })
    }

    const userTier = user.tier || 'NONE'
    const rate = this.chatService.checkMessageRate(user.id, userTier)

    if (!rate.allowed) {
      throw new WsException({
        code: 'RATE_LIMIT',
        message: 'Demasiados mensajes, bajá un cambio en la tribuna 😅',
        data: rate,
      })
    }

    const {
      finalStickerId,
      finalNameColor,
      finalChatBubble,
      isMegaphoneActive,
    } = await this.chatService.processMessageAssets(
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
      nameColor: finalNameColor,
      tier: profile?.tier || user.tier || 'NONE',
      role: profile?.role || user.role || 'USER',
      chatBubbleId: finalChatBubble,
      isMegaphone: isMegaphoneActive,
      timestamp: Date.now(),
    }

    const matchKey = `chat:match:${matchId}:history`
    await this.redisService.redis.rpush(
      matchKey,
      JSON.stringify(messagePayload),
    )
    await this.redisService.redis.ltrim(matchKey, -50, -1)

    await this.redisService.redis.zincrby(
      'leaderboard:chat-messages',
      1,
      user.id,
    )

    if (isMegaphoneActive) {
      const megaphoneQueueKey = `chat:match:${matchId}:megaphone:queue`
      await this.redisService.redis.rpush(
        megaphoneQueueKey,
        JSON.stringify(messagePayload),
      )

      const queuePosition =
        await this.redisService.redis.llen(megaphoneQueueKey)

      this.server.to(`user:${user.id}`).emit('megaphone_queued', {
        position: queuePosition,
        message: 'Tu megáfono está en cola para este partido',
      })
    }

    // 8. Emisión del mensaje
    this.server.to(`match_${matchId}`).emit('on-message', messagePayload)
  }

  @UseGuards(WsJwtGuard)
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
    const result = await this.chatService.deleteMatchMessage(
      matchId,
      messageId,
      client.data.user,
    )

    if (result === 'not_found') {
      throw new WsException('No se encontró el mensaje en este partido')
    }
    if (result === 'forbidden') {
      throw new WsException('No podés borrar este mensaje')
    }

    this.server.to(`match_${matchId}`).emit('on_message_deleted', { messageId })

    return { status: 'ok', message: 'Mensaje de partido eliminado' }
  }

  // Agregá este método al final de tu clase MatchesGateway
  /**
   * Estado del partido para decidir si el chat acepta mensajes. Se cachea unos
   * segundos para no consultar la base por cada mensaje; LiveScoreCron borra la
   * caché cuando el estado cambia. Un partido inexistente cuenta como cerrado.
   */
  private async getMatchStatus(matchId: string): Promise<string | null> {
    const key = matchStatusCacheKey(matchId)
    const cached = await this.redisService.redis.get(key)
    if (cached) return cached

    const match = await this.prisma.matches.findUnique({
      where: { id: matchId },
      select: { status_short: true },
    })
    if (!match) return null

    await this.redisService.redis.set(
      key,
      match.status_short,
      'EX',
      MATCH_STATUS_CACHE_TTL_SECONDS,
    )
    return match.status_short
  }

  /** Gol del partido: aviso de gol y mensaje del bot. Tiro errado en la tanda: cargada. */
  private reactToEvent(matchId: string, event: BotWireEvent) {
    const reaction = botReactionTo(event)
    if (!reaction) return

    const playerName = event.player?.name || 'un jugadorazo'
    let botText: string
    if (reaction === 'GOAL') {
      this.server.to(`match_${matchId}`).emit('goal_scored', {
        matchId,
        teamId: event.team?.id,
        player: event.player?.name,
        minute: event.time?.elapsed,
      })
      botText = goalMessage(event.team?.name || 'el equipo', playerName)
    } else {
      botText = shootoutMissMessage(event.player?.name || 'el pateador')
    }

    this.sendBotMessage(matchId, botText).catch((err) => {
      this.logger.error(`Error enviando mensaje del bot: ${err.message}`)
    })
  }

  private async sendBotMessage(matchId: string, botText: string) {
    const messagePayload = {
      messageId: randomUUID(),
      matchId,
      userId: 'bot-system-001',
      name: 'VAR Bot 🤖',
      teamName: 'AFA',
      badgeUrl: null,
      message: botText,
      stickerId: null,
      nameColor: '#d2f000',
      tier: 'SYSTEM',
      role: 'BOT',
      chatBubbleId: null,
      isMegaphone: false,
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
}
