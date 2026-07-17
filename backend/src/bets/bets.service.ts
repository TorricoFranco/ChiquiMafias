// bets/bets.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { WalletService } from '../wallet/wallet.service'
import { BetsGateway } from './bets.gateway'
import { CreateBetDto } from './dto/create-bet.dto'
import { CreateMarketDto } from './dto/create-market.dto'
import { SettleMarketDto } from './dto/settle-market.dto'
import { randomUUID } from 'crypto'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { ChatGateway } from 'src/chat/chat.gateway'
import { RedisService } from 'src/redis/redis.service'
import { PLACE_BET_LUA_SCRIPT } from './bets.scripts'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'

@Injectable()
export class BetsService {
  private readonly logger = new Logger(BetsService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly betsGateway: BetsGateway,
    private readonly eventEmitter: EventEmitter2,
    private readonly chatGateway: ChatGateway,
    private readonly redisService: RedisService,
    @InjectQueue('bets-queue') private betsQueue: Queue,
  ) { }

  /**
   * Resuelve el GET del Frontend trayendo mercados abiertos o pausados en vivo
   */
  async getActiveMarkets() {
    return this.prisma.market.findMany({
      where: {
        status: { in: ['OPEN', 'LOCKED'] },
      },
      include: {
        options: true,
      },
      orderBy: { closesAt: 'asc' },
    })
  }

  /**
   * Procesa de forma atómica la creación de una apuesta y distribuye por WS
   */
  async placeBet(userId: string, dto: CreateBetDto) {
    const { optionId, stake, marketId } = dto
    const redis = this.redisService.redis

    const walletKey = `wallet:${userId}:balance`
    const marketKey = `market:${marketId}`
    const now = Date.now()

    const luaResult = await redis.eval(
      PLACE_BET_LUA_SCRIPT,
      3,
      walletKey,
      marketKey,
      optionId,
      stake,
      now,
    )

    const result = JSON.parse(luaResult as string)

    if (result.error) {
      throw new BadRequestException(result.error)
    }

    const betId = randomUUID()

    this.chatGateway.sendWalletUpdate(userId, result.new_balance)

    this.betsGateway.emitPoolUpdate(marketId, {
      optionId: optionId,
      newTotalStaked: result.new_pool,
    })

    await this.betsQueue.add('persist-bet', {
      betId,
      userId,
      optionId,
      marketId,
      stake,
      timestamp: now,
    })

    return {
      id: betId,
      status: 'ACCEPTED_PENDING_SAVE',
      message: 'Apuesta tomada con éxito',
    }
  }

  async createManualMarket(dto: CreateMarketDto) {
    const market = await this.prisma.market.create({
      data: {
        title: dto.title,
        closesAt: new Date(dto.closesAt),
        isManual: true,
        status: 'OPEN',
        options: {
          create: dto.options.map((opt) => ({
            name: opt.name,
            initialProb: opt.initialProb,
            totalStaked: 0,
          })),
        },
      },
      include: { options: true },
    })

    const redis = this.redisService.redis
    const marketKey = `market:${market.id}`

    await redis.hset(
      marketKey,
      'status',
      'OPEN',
      'closesAt',
      new Date(dto.closesAt).getTime().toString(),
    )

    for (const opt of market.options) {
      await redis.hset(marketKey, opt.id, '0')
    }

    this.betsGateway.emitMarketCreated(market)

    return market
  }

  async getUserBets(userId: string) {
    return this.prisma.bet.findMany({
      where: { userId },
      include: {
        option: {
          select: {
            name: true,
            market: {
              select: { title: true, status: true, closesAt: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async settleMarket(marketId: string, dto: SettleMarketDto) {
    const { status, winningOptionId } = dto

    const redis = this.redisService.redis
    await redis.hset(`market:${marketId}`, 'status', 'SETTLED')

    if (status === 'SETTLED' && !winningOptionId) {
      throw new BadRequestException('Debe especificar la opción ganadora')
    }

    const pendingEvents: Array<{
      userId: string
      status: 'WON' | 'LOST' | 'REFUND'
      coins: number
      matchTitle: string
    }> = []

    const finalMarket = await this.prisma.$transaction(async (tx) => {
      const market = await tx.market.findUnique({
        where: { id: marketId },
        include: {
          options: { include: { bets: true } },
        },
      })

      if (!market) throw new NotFoundException('El mercado no existe')
      if (market.status === 'SETTLED' || market.status === 'REFUNDED') {
        throw new BadRequestException(
          'Este mercado ya fue liquidado anteriormente',
        )
      }

      const totalPool = market.options.reduce(
        (sum, opt) => sum + opt.totalStaked,
        0,
      )
      const winningOption =
        status === 'SETTLED'
          ? market.options.find((o) => o.id === winningOptionId)
          : undefined
      let triggerRefund = status === 'REFUNDED'

      if (status === 'SETTLED') {
        if (!winningOption)
          throw new NotFoundException(
            'La opción ganadora no pertenece a este mercado',
          )
        if (winningOption.totalStaked === 0) triggerRefund = true
      }

      const finalStatusToSet = triggerRefund ? 'REFUNDED' : 'SETTLED'

      const lock = await tx.market.updateMany({
        where: {
          id: marketId,
          status: market.status,
        },
        data: {
          status: finalStatusToSet,
          settledAt: new Date(),
        },
      })

      if (lock.count === 0) {
        throw new BadRequestException(
          'El mercado ya está siendo liquidado por otra solicitud.',
        )
      }

      // REEMBOLSOS
      if (triggerRefund) {
        for (const option of market.options) {
          for (const bet of option.bets) {
            const wallet = await tx.wallet.update({
              where: { userId: bet.userId },
              data: { balance: { increment: bet.stake } },
            })

            await redis.set(`wallet:${bet.userId}:balance`, wallet.balance)

            await tx.coinTransaction.create({
              data: {
                walletId: wallet.id,
                amount: bet.stake,
                type: 'BET_REFUND',
                description: `Reembolso: Mercado anulado o desierto: ${market.title}`,
                referenceId: bet.id,
              },
            })
            await tx.bet.update({
              where: { id: bet.id },
              data: { status: 'REFUNDED' },
            })

            pendingEvents.push({
              userId: bet.userId,
              status: 'REFUND',
              coins: bet.stake,
              matchTitle: market.title,
            })
          }
        }

        //  mercado actualizado
        return { ...market, status: finalStatusToSet, settledAt: new Date() }
      }

      // LIQUIDACIÓN NORMAL
      const multiplier = totalPool / winningOption!.totalStaked

      for (const option of market.options) {
        const isWinner = option.id === winningOptionId
        for (const bet of option.bets) {
          if (isWinner) {
            const payout = Math.floor(bet.stake * multiplier)

            const wallet = await tx.wallet.update({
              where: { userId: bet.userId },
              data: { balance: { increment: payout } },
            })

            await redis.set(`wallet:${bet.userId}:balance`, wallet.balance)

            await tx.coinTransaction.create({
              data: {
                walletId: wallet.id,
                amount: payout,
                type: 'BET_PAYOUT',
                description: `Premio: Ganaste apuesta en ${market.title} (${option.name})`,
                referenceId: bet.id,
              },
            })
            await tx.bet.update({
              where: { id: bet.id },
              data: { status: 'WON' },
            })

            pendingEvents.push({
              userId: bet.userId,
              status: 'WON',
              coins: payout,
              matchTitle: market.title,
            })
          } else {
            await tx.bet.update({
              where: { id: bet.id },
              data: { status: 'LOST' },
            })

            pendingEvents.push({
              userId: bet.userId,
              status: 'LOST',
              coins: 0,
              matchTitle: market.title,
            })
          }
        }
      }

      // mercado actualizado
      return { ...market, status: finalStatusToSet, settledAt: new Date() }
    })

    // EMISIÓN DE EVENTOS
    this.betsGateway.emitMarketStatusChange(
      marketId,
      finalMarket.status as 'LOCKED' | 'SETTLED' | 'REFUNDED',
    )

    pendingEvents.forEach((event) => {
      this.eventEmitter.emit('bet.settled', event)
    })

    return finalMarket
  }
}
