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

import { calculateMarketOdds } from './utils/odds.util'

// La liquidación recorre todas las apuestas del mercado en una sola transacción:
// con el timeout por defecto de Prisma (5 s) un partido grande nunca terminaría
const SETTLEMENT_TX_OPTIONS = { maxWait: 10_000, timeout: 60_000 }

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
  ) {}

  /**
   * Resuelve el GET del Frontend trayendo mercados abiertos o pausados en vivo con cuotas calculadas
   */
  async getActiveMarkets() {
    const markets = await this.prisma.market.findMany({
      where: {
        status: { in: ['OPEN'] },
      },
      include: {
        options: true,
      },
      orderBy: { closesAt: 'asc' },
    })

    return markets.map((market) => calculateMarketOdds(market))
  }

  /**
   * Procesa de forma atómica la creación de una apuesta y distribuye por WS las cuotas recalculadas
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

    // Recuperar mercado de la DB para recalcular cuotas con Pari-Mutuel
    const market = await this.prisma.market.findUnique({
      where: { id: marketId },
      include: { options: true },
    })

    let newOdds = 1.0
    let updatedOptions: any[] = []

    if (market) {
      const marketWithUpdatedStakes = {
        ...market,
        options: market.options.map((opt) =>
          opt.id === optionId ? { ...opt, totalStaked: result.new_pool } : opt,
        ),
      }
      const calculatedMarket = calculateMarketOdds(marketWithUpdatedStakes)
      const targetOption = calculatedMarket.options.find(
        (o) => o.id === optionId,
      )
      newOdds = targetOption?.currentOdds ?? 1.0
      updatedOptions = calculatedMarket.options.map((o) => ({
        id: o.id,
        currentOdds: o.currentOdds,
        totalStaked: o.totalStaked,
      }))
    }

    this.betsGateway.emitPoolUpdate(marketId, {
      optionId: optionId,
      newTotalStaked: result.new_pool,
      newOdds: newOdds,
      options: updatedOptions,
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
    const market = (await this.prisma.market.create({
      data: {
        title: dto.title,
        type: dto.type ?? 'CUSTOM',
        category: dto.category,
        description: dto.description,
        metadata: dto.metadata ? (dto.metadata as any) : undefined,
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
    })) as any

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

    const calculatedMarket = calculateMarketOdds(market)
    this.betsGateway.emitMarketCreated(calculatedMarket)

    return calculatedMarket
  }

  async getUserBets(userId: string) {
    const bets = await this.prisma.bet.findMany({
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

    return bets.map((bet) => ({
      id: bet.id,
      marketTitle: bet.option.market.title,
      optionName: bet.option.name,
      stake: bet.stake,
      payout: bet.payout ?? 0,
      multiplier: bet.multiplier ?? 0,
      status: bet.status,
      marketStatus: bet.option.market.status,
      createdAt: bet.createdAt,
    }))
  }

  async settleMarket(marketId: string, dto: SettleMarketDto) {
    const { status, winningOptionId } = dto

    if (status === 'SETTLED' && !winningOptionId) {
      throw new BadRequestException('Debe especificar la opción ganadora')
    }

    // Validación previa: no cerrar en Redis un mercado que no se va a poder liquidar
    const current = await this.prisma.market.findUnique({
      where: { id: marketId },
      select: { status: true, options: { select: { id: true } } },
    })

    if (!current) throw new NotFoundException('El mercado no existe')
    if (current.status === 'SETTLED' || current.status === 'REFUNDED') {
      throw new BadRequestException(
        'Este mercado ya fue liquidado anteriormente',
      )
    }
    if (
      status === 'SETTLED' &&
      !current.options.some((o) => o.id === winningOptionId)
    ) {
      throw new NotFoundException(
        'La opción ganadora no pertenece a este mercado',
      )
    }

    // Corta las apuestas nuevas antes de leer las existentes
    await this.redisService.redis.hset(
      `market:${marketId}`,
      'status',
      'SETTLED',
    )

    // Usuarios cuyo saldo cambió, para sincronizar Redis después del commit
    const usersToSync = new Set<string>()

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

            usersToSync.add(bet.userId)

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
              data: {
                status: 'REFUNDED',
                payout: bet.stake,
                multiplier: 1,
              },
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

            usersToSync.add(bet.userId)

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
              data: {
                status: 'WON',
                payout: payout,
                multiplier: multiplier,
              },
            })

            const currentStats = await tx.userStats.findUnique({
              where: { userId: bet.userId },
            })

            const newStreak = (currentStats?.currentWinStreak || 0) + 1
            const newMaxStreak = Math.max(
              currentStats?.longestWinStreak || 0,
              newStreak,
            )
            const newHighestMult = Math.max(
              currentStats?.highestMultiplier || 0,
              multiplier,
            )

            await tx.userStats.upsert({
              where: { userId: bet.userId },
              create: {
                userId: bet.userId,
                totalBetsWon: 1,
                totalCoinsWon: payout,
                currentWinStreak: 1,
                longestWinStreak: 1,
                highestMultiplier: multiplier,
              },
              update: {
                totalBetsWon: { increment: 1 },
                totalCoinsWon: { increment: payout },
                currentWinStreak: newStreak,
                longestWinStreak: newMaxStreak,
                highestMultiplier: newHighestMult,
              },
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
              data: {
                status: 'LOST',
                payout: 0,
                multiplier: multiplier,
              },
            })

            await tx.userStats.updateMany({
              where: { userId: bet.userId },
              data: { currentWinStreak: 0 },
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
    }, SETTLEMENT_TX_OPTIONS)

    // El mercado ya quedó liquidado en la DB: un fallo de Redis no corta el resto.
    // Se relee el saldo de la DB: otra operación pudo cambiarlo después del commit.
    for (const userId of usersToSync) {
      try {
        await this.walletService.syncBalanceCache(userId)
      } catch (error) {
        this.logger.error(
          `No se pudo sincronizar el saldo de ${userId} en Redis tras liquidar ${marketId}`,
          error instanceof Error ? error.message : String(error),
        )
      }
    }

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
