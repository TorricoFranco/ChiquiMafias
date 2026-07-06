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
import { Bet } from '@prisma/client'
import { randomUUID } from 'crypto'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { ChatGateway } from 'src/chat/chat.gateway'

@Injectable()
export class BetsService {
  private readonly logger = new Logger(BetsService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly betsGateway: BetsGateway,
    private readonly eventEmitter: EventEmitter2,
    private readonly chatGateway: ChatGateway,
  ) {}

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
  async placeBet(userId: string, dto: CreateBetDto): Promise<Bet> {
    const { optionId, stake } = dto

    try {
      const { newBet, targetMarketId, updatedBalance } =
        await this.prisma.$transaction(async (tx) => {
          const option = await tx.marketOption.findUnique({
            where: { id: optionId },
            include: { market: true },
          })

          if (!option) {
            throw new NotFoundException(
              'La opción de apuesta seleccionada no existe',
            )
          }

          const market = option.market

          if (market.status !== 'OPEN') {
            throw new BadRequestException('Este mercado ya no acepta apuestas')
          }

          const now = new Date()
          if (now >= market.closesAt) {
            throw new BadRequestException('Apuesta rechazada: El mercado cerró')
          }

          const betId = randomUUID()


          const updatedWallet = await this.walletService.subtractCoins(
            {
              userId,
              amount: stake,
              type: 'BET_STAKE',
              description: `Apuesta: ${market.title} (${option.name})`,
              referenceId: betId,
            },
            tx,
          )

          const createdBet = await tx.bet.create({
            data: {
              id: betId,
              userId,
              optionId,
              stake,
              status: 'PENDING',
            },
          })

          await tx.marketOption.update({
            where: { id: optionId },
            data: { totalStaked: { increment: stake } },
          })

          this.logger.log(
            `[BET OK] Usuario ${userId} apostó ${stake} a [${option.name}]`,
          )

          return {
            newBet: createdBet,
            targetMarketId: market.id,
            updatedBalance: updatedWallet.balance, 
          }
        })

      this.chatGateway.sendWalletUpdate(userId, updatedBalance)

      const updatedMarket = await this.prisma.market.findUnique({
        where: { id: targetMarketId },
        include: { options: true },
      })

      if (updatedMarket) {
        const totalPool = updatedMarket.options.reduce(
          (sum, opt) => sum + opt.totalStaked,
          0,
        )
        this.betsGateway.emitPoolUpdate(targetMarketId, {
          totalPool,
          options: updatedMarket.options.map((opt) => ({
            id: opt.id,
            totalStaked: opt.totalStaked,
          })),
        })
      }

      return newBet
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error
      }
      this.logger.error(
        `Fallo crítico al procesar apuesta del usuario ${userId}`,
        error.stack,
      )
      throw new InternalServerErrorException('No se pudo procesar la apuesta')
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

      // REEMBOLSOS
      if (triggerRefund) {
        for (const option of market.options) {
          for (const bet of option.bets) {
            const wallet = await tx.wallet.update({
              where: { userId: bet.userId },
              data: { balance: { increment: bet.stake } },
            })
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

            // evento de reembolso
            pendingEvents.push({
              userId: bet.userId,
              status: 'REFUND',
              coins: bet.stake,
              matchTitle: market.title,
            })
          }
        }
        return tx.market.update({
          where: { id: marketId },
          data: { status: 'REFUNDED', settledAt: new Date() },
        })
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

            //  evento de ganador
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

            // evento de perdedor
            pendingEvents.push({
              userId: bet.userId,
              status: 'LOST',
              coins: 0,
              matchTitle: market.title,
            })
          }
        }
      }

      return tx.market.update({
        where: { id: marketId },
        data: { status: 'SETTLED', settledAt: new Date() },
      })
    })

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
