import { Injectable, BadRequestException } from '@nestjs/common'
import { WsException } from '@nestjs/websockets/errors/ws-exception'
import { RedisService } from 'src/redis/redis.service'
import { PrismaService } from 'src/prisma/prisma.service'
import { ChatClient } from './interfaces/ChatClient'
import { RateLimitState } from './interfaces/RateLimitState'
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter'
import { Interval } from '@nestjs/schedule'
import { CHAT_RATE_LIMITS, DEFAULT_RATE_LIMIT } from './constants/chat-rules'


@Injectable()
export class ChatService {
  private clients = new Map<string, ChatClient>()
  private rateMap = new Map<string, RateLimitState>()

  constructor(
    private readonly redisService: RedisService,
    private readonly prismaService: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  @OnEvent('report.resolved')
  async handleReportResolved(payload: any) {
    if (payload.action === 'MUTE' && payload.durationHours > 0) {
      const durationSeconds = payload.durationHours * 60 * 60
      await this.executeMute(payload.targetUserId, durationSeconds)
    }
  }


  @Interval(1000)
  async processMegaphoneQueue() {
    const activeMegaphone = await this.redisService.redis.get('chat:megaphone:active');

    if (activeMegaphone) {
      return;
    }

    const nextMegaphone = await this.redisService.redis.lpop('chat:megaphone:queue');

    if (nextMegaphone) {
      await this.redisService.redis.set('chat:megaphone:active', nextMegaphone, 'EX', 15);

      const payload = JSON.parse(nextMegaphone);

      this.eventEmitter.emit('megaphone.show', payload);
    }
  }

  onClientConnected(clientData: ChatClient) {
    this.clients.set(clientData.socketId, {
      socketId: clientData.socketId,
      userId: clientData.userId,
      username: clientData.username,
      teamName: clientData.teamName,
      badgeUrl: clientData.badgeUrl,
      tier: clientData.tier || 'NONE',
      role: clientData.role || 'USER',
    });
  }

  onClientDisconnected(socketId: string) {
    const client = this.clients.get(socketId)

    if (client && client.userId) {
      this.rateMap.delete(client.userId)
    }

    this.clients.delete(socketId)
  }

  getConnectedClients() {
    return Array.from(this.clients.values())
  }

  getProfileBySocketId(socketId: string): ChatClient | undefined {
    return this.clients.get(socketId)
  }

  updateActiveUserProfile(
    userId: string,
    data: {
      username: string | null
      teamName: string | null
      badgeUrl: string | null
    },
  ) {
    for (const [socketId, client] of this.clients.entries()) {
      if (client.userId === userId) {
        client.username = data.username
        client.teamName = data.teamName
        client.badgeUrl = data.badgeUrl
      }
    }
  }

  checkMessageRate(userId: string, tier: string = 'NONE') {
    const now = Date.now();
    
    const limits = CHAT_RATE_LIMITS[tier] ?? DEFAULT_RATE_LIMIT;
    const { windowMs, maxMessages, penalties } = limits;

    const state = this.rateMap.get(userId) ?? { timestamps: [], strikes: 0 };

    if (state.blockedUntil && now < state.blockedUntil) {
      return {
        allowed: false,
        retryIn: Math.ceil((state.blockedUntil - now) / 1000),
      };
    }

    state.timestamps = state.timestamps.filter((t) => now - t < windowMs);

    if (state.timestamps.length >= maxMessages) {
      state.strikes += 1;
      const penaltySeconds = penalties[state.strikes - 1] ?? penalties[penalties.length - 1] ?? 300; 
      
      state.blockedUntil = now + penaltySeconds * 1000;
      state.timestamps = [];
      this.rateMap.set(userId, state);

      return {
        allowed: false,
        retryIn: penaltySeconds,
        strike: state.strikes,
      };
    }

    state.timestamps.push(now);
    this.rateMap.set(userId, state);
    
    return { allowed: true };
}

  async deleteGlobalMessage(messageId: string): Promise<boolean> {
    const globalKey = 'chat:global:history'
    const history = await this.redisService.redis.lrange(globalKey, 0, -1)

    const messageToRemove = history.find((msgStr) => {
      try {
        const parsed = JSON.parse(msgStr)
        return parsed.messageId === messageId
      } catch {
        return false
      }
    })

    if (messageToRemove) {
      await this.redisService.redis.lrem(globalKey, 1, messageToRemove)
      return true
    }
    return false
  }

  async deleteMatchMessage(
    matchId: string,
    messageId: string,
  ): Promise<boolean> {
    const matchKey = `chat:match:${matchId}:history`
    const history = await this.redisService.redis.lrange(matchKey, 0, -1)

    const messageToRemove = history.find((msgStr) => {
      try {
        const parsed = JSON.parse(msgStr)
        return parsed.messageId === messageId
      } catch {
        return false
      }
    })

    if (messageToRemove) {
      await this.redisService.redis.lrem(matchKey, 1, messageToRemove)
      return true
    }
    return false
  }

  async processMessageAssets(
    userId: string,
    stickerId?: string,
    useMegaphone?: boolean,
  ) {
    let finalStickerId: string | null = null
    let isMegaphoneActive = false

    let [finalNameColor, finalChatBubble] = await this.redisService.redis.mget(
      `user:cosmetics:${userId}:color`,
      `user:cosmetics:${userId}:chat_bubble`,
    )

    if (!finalNameColor || !finalChatBubble) {
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
        include: { inventory: { include: { item: true } } },
      })

      if (user) {
        if (!finalChatBubble && user.activeChatBubbleId) {
          const item = await this.prismaService.storeItem.findUnique({
            where: { id: user.activeChatBubbleId },
          })
          finalChatBubble = item?.assetId || null
          if (finalChatBubble) {
            await this.redisService.redis.set(
              `user:cosmetics:${userId}:chat_bubble`,
              finalChatBubble,
              'EX',
              86400,
            )
          }
        }

        if (!finalNameColor && user.activeNameColorId) {
          const item = await this.prismaService.storeItem.findUnique({
            where: { id: user.activeNameColorId },
          })
          finalNameColor = item?.assetId || null
          if (finalNameColor)
            await this.redisService.redis.set(
              `user:cosmetics:${userId}:color`,
              finalNameColor,
              'EX',
              86400,
            )
        }
      }
    }

    if (stickerId) {
      const hasSticker = await this.prismaService.userInventory.findFirst({
        where: {
          userId,
          item: { assetId: stickerId, type: 'STICKER_PACK' },
          quantity: { gte: 1 },
        },
      })
      if (!hasSticker)
        throw new WsException('No tenés comprado este sticker! ❌')
      finalStickerId = stickerId
    }

    if (useMegaphone) {
      try {
        await this.prismaService.$transaction(async (tx) => {
          const megaphoneInv = await tx.userInventory.findFirst({
            where: {
              userId,
              item: { type: 'MEGAPHONE' },
              quantity: { gte: 1 },
            },
          })

          if (!megaphoneInv)
            throw new BadRequestException('No te quedan megáfonos 📢')

          if (megaphoneInv.quantity === 1) {
            await tx.userInventory.delete({ where: { id: megaphoneInv.id } })
          } else {
            await tx.userInventory.update({
              where: { id: megaphoneInv.id },
              data: { quantity: { decrement: 1 } },
            })
          }
        })
        isMegaphoneActive = true
      } catch (err) {
        throw new WsException(err.message || 'Error al usar megáfono')
      }
    }

    return { finalStickerId, finalNameColor, finalChatBubble, isMegaphoneActive }
  }

  async executeMute(userId: string, durationSeconds: number) {
    const redisKey = `timeout:${userId}`
    await this.redisService.redis.set(redisKey, 'true', 'EX', durationSeconds)
  }

  async isUserMuted(
    userId: string,
  ): Promise<{ isMuted: boolean; remainingSeconds: number }> {
    const redisKey = `timeout:${userId}`
    const isMuted = await this.redisService.redis.get(redisKey)

    if (!isMuted) {
      return { isMuted: false, remainingSeconds: 0 }
    }

    const ttl = await this.redisService.redis.ttl(redisKey)

    return {
      isMuted: true,
      remainingSeconds: ttl > 0 ? ttl : 0,
    }
  }
}
