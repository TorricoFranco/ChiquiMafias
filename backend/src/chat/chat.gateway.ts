import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets'
import {
  UseGuards,
  UsePipes,
  ValidationPipe,
  UseFilters,
  Logger,
} from '@nestjs/common'

import { Server, Socket } from 'socket.io'
import { ChatService } from './chat.service'
import { AuthService } from 'src/auth/auth.service'
import { SendMessageDto } from './dto/send-message.dto'
import type { SocketWithUser } from 'src/auth/interfaces/active-user.interface'
import { WsJwtGuard } from 'src/auth/guards/ws-jwt.guard'
import { WsTimeoutGuard } from 'src/auth/guards/ws-timeout.guard'
import { AllWsExceptionFilter } from 'src/filters/ws-exception.filter'
import { SanitizeMessagePipe } from 'src/pipes/sanitize-message.pipe'
import { randomUUID } from 'crypto'
import { RedisService } from '../redis/redis.service'
import { RolesGuard } from 'src/auth/guards/roles.guard'
import { SystemRole } from 'src/auth/enums/roles.enum'
import { Roles } from 'src/auth/decorators/roles.decorator'
import { INotificationResponse } from 'src/notifications/interfaces/notification-response.interface'
import { OnEvent } from '@nestjs/event-emitter'
import { CreatePollDto } from 'src/polls/dto/create-poll.dto'

import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
} from '@nestjs/websockets'

@WebSocketGateway()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() public server: Server
  private readonly logger = new Logger(ChatGateway.name)

  constructor(
    private readonly chatService: ChatService,
    private readonly redisService: RedisService,
    private readonly authService: AuthService,
  ) {}

  async handleConnection(socket: Socket) {
    try {
      const token = socket.handshake.auth?.token
      if (!token) {
        this.logger.log(`[Chat] Conexión anónima o sin token: ${socket.id}`)
        return
      }

      const wsUser = await this.authService.authenticateSocket(token)
      if (!wsUser) {
        socket.disconnect()
        return
      }

      socket.data.user = wsUser

      await socket.join(`user:${wsUser.id}`)
      this.logger.log(
        `[Chat] ${wsUser.username} entró a la tribuna global. Tier: ${wsUser.tier}`,
      )

      // CHEQUEO DE RECOMPENSAS PENDIENTES
      const pendingRewardKey = `pending_reward:${wsUser.id}`
      const pendingRewardStr =
        await this.redisService.redis.get(pendingRewardKey)

      if (pendingRewardStr) {
        try {
          const pendingReward = JSON.parse(pendingRewardStr)
          // Emitimos la recompensa pendiente
          socket.emit('subscription_gift_received', pendingReward)
          // Borramos de Redis para que no se duplique al recargar F5
          await this.redisService.redis.del(pendingRewardKey)
          this.logger.log(
            `[Chat] Recompensa pendiente entregada a ${wsUser.username}`,
          )
        } catch (error) {
          this.logger.error(
            `Error parseando recompensa de ${wsUser.username}`,
            error,
          )
        }
      }

      this.chatService.onClientConnected({
        socketId: socket.id,
        userId: wsUser.id,
        username: wsUser.username,
        teamName: wsUser.team?.name || null,
        badgeUrl: wsUser.team?.badgeUrl || null,
        tier: wsUser.tier || null,
        role: wsUser.role || 'USER',
      })

      this.server.emit(
        'on-clients-changed',
        this.chatService.getConnectedClients(),
      )

      const globalHistory = await this.redisService.redis.lrange(
        'chat:global:history',
        0,
        -1,
      )
      const parsedHistory = globalHistory.map((msg) => JSON.parse(msg))
      socket.emit('global_chat_history', parsedHistory)
      socket.emit(
        'welcome-message',
        'Bienvenido a la tribuna central, paaaaadreee',
      )
    } catch (error) {
      console.error('Error en conexión ChatGateway:', error)
      socket.disconnect()
    }
  }

  handleDisconnect(socket: Socket) {
    this.chatService.onClientDisconnected(socket.id)
    this.server.emit(
      'on-clients-changed',
      this.chatService.getConnectedClients(),
    )
  }

  @UseGuards(WsJwtGuard, WsTimeoutGuard)
  @UseFilters(AllWsExceptionFilter)
  @UsePipes(new ValidationPipe({ transform: true }), new SanitizeMessagePipe())
  @SubscribeMessage('send-message')
  async handleMessage(
    @MessageBody() body: SendMessageDto,
    @ConnectedSocket() client: SocketWithUser,
  ) {
    if (!client.data?.user?.id) throw new WsException('No autenticado')
    const user = client.data.user

    // Rate Limit

    const userTier = user.tier || 'NONE'
    const rate = this.chatService.checkMessageRate(user.id, userTier)

    if (!rate.allowed) {
      throw new WsException({
        code: 'RATE_LIMIT',
        message: 'Demasiados mensajes, bajá un cambio ',
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
      userId: user.id,
      name: profile?.username || user.username || user.name,
      teamName: profile?.teamName,
      badgeUrl: profile?.badgeUrl,
      message: body.body,
      stickerId: finalStickerId,
      nameColor: finalNameColor,
      tier: profile?.tier || user.tier || 'NONE',
      role: profile?.role || user.role || 'USER',
      chatBubbleId: finalChatBubble,
      isMegaphone: isMegaphoneActive,
      timestamp: Date.now(),
    }

    // GLOBAL MESSAGE HISTORY
    const globalKey = 'chat:global:history'
    await this.redisService.redis.rpush(
      globalKey,
      JSON.stringify(messagePayload),
    )
    await this.redisService.redis.ltrim(globalKey, -50, -1)
    // MESSAGE COUNT
    await this.redisService.redis.zincrby(
      'leaderboard:chat-messages',
      1,
      user.id,
    )

    if (isMegaphoneActive) {
      await this.redisService.redis.rpush(
        'chat:megaphone:queue',
        JSON.stringify(messagePayload),
      )

      const queuePosition = await this.redisService.redis.llen(
        'chat:megaphone:queue',
      )

      this.server.to(`user:${user.id}`).emit('megaphone_queued', {
        position: queuePosition,
        message: 'Tu megáfono está en cola',
      })
    }

    this.server.emit('on-message', messagePayload)
  }

  @UseGuards(WsJwtGuard, RolesGuard)
  @Roles(SystemRole.MODERATOR, SystemRole.ADMIN)
  @UseFilters(AllWsExceptionFilter)
  @SubscribeMessage('delete_message')
  async handleDeleteMessage(
    @MessageBody() data: { messageId: string },
    @ConnectedSocket() client: SocketWithUser,
  ) {
    if (!data.messageId) {
      throw new WsException('El messageId es requerido')
    }

    const deleted = await this.chatService.deleteGlobalMessage(data.messageId)

    if (!deleted) {
      throw new WsException('No se encontró el mensaje o ya fue eliminado')
    }

    this.server.emit('on_message_deleted', { messageId: data.messageId })

    return { status: 'ok', message: 'Mensaje eliminado correctamente' }
  }

  sendNotificationToUser(userId: string, notificationPayload: any) {
    this.server.to(`user:${userId}`).emit('notification', notificationPayload)
  }

  broadcastNotification(data: INotificationResponse) {
    this.server.emit('notification', data)
  }

  sendWalletUpdate(userId: string, balance: number) {
    this.server.to(`user:${userId}`).emit('wallet:balance_updated', { balance })
    this.logger.debug(
      `[Sockets] Saldo actualizado enviado a user:${userId} -> $${balance}`,
    )
  }

  @OnEvent('megaphone.show')
  handleMegaphoneBroadcast(payload: any) {
    this.server.emit('megaphone_show', payload)
    this.logger.debug(
      `[ChatGateway] Megáfono emitido para el usuario ${payload.name}`,
    )
  }

  @OnEvent('poll.created')
  async handlePollCreated(poll: any) {
    const pollPayload = {
      id: poll.id,
      title: poll.title,
      timestamp: Date.now(),
    }

    this.server.emit('poll_show', pollPayload)
    this.logger.debug(
      `[ChatGateway] Evento poll_show emitido para la encuesta ${poll.id}`,
    )
  }

  @OnEvent('subscription.purchased')
  async handleSubscriptionPurchased(payload: {
    userId: string
    tier: string
    giftData: any
  }) {
    const rewardPayload = {
      tier: payload.tier,
      gifts: payload.giftData,
    }

    await this.redisService.redis.setex(
      `pending_reward:${payload.userId}`,
      86400,
      JSON.stringify(rewardPayload),
    )

    this.server
      .to(`user:${payload.userId}`)
      .emit('subscription_gift_received', rewardPayload)

    this.logger.debug(
      `[ChatGateway] Regalos de suscripción (Tier ${payload.tier}) guardados en Redis y emitidos al usuario ${payload.userId}`,
    )
  }
}
