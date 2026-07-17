import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'
import { ChatGateway } from '../chat/chat.gateway'

import { WalletOperation } from './interfaces/wallet-operation.interface'
import { Prisma, Wallet } from '@prisma/client'

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatGateway: ChatGateway,
    private readonly redisService: RedisService,
  ) { }

  async updateWalletBalance(userId: string, amount: number, type: any) {
    const updatedWallet = await this.prisma.wallet.update({
      where: { userId },
      data: { balance: { increment: amount } },
    })

    this.chatGateway.server.to(userId).emit('wallet:balance_updated', {
      balance: updatedWallet.balance,
    })

    return updatedWallet
  }

  /**
   * Agrega monedas de forma atómica y registra la transacción
   */
  async addCoins(operation: WalletOperation): Promise<Wallet> {
    const { userId, amount, type, description, referenceId } = operation

    if (amount <= 0) {
      throw new BadRequestException('El monto a agregar debe ser mayor a cero')
    }

    try {
      const updatedWallet = await this.prisma.$transaction(async (tx) => {
        const wallet = await tx.wallet.upsert({
          where: { userId },
          update: { balance: { increment: amount } },
          create: {
            userId,
            balance: 1000 + amount,
          },
        })

        await tx.coinTransaction.create({
          data: {
            walletId: wallet.id,
            amount: amount,
            type: type,
            description: description,
            referenceId: referenceId || null,
          },
        })

        this.logger.log(
          `[WALLET DB OK] +${amount} coins a User:${userId} por ${type}`,
        )
        return wallet
      })

      const redisClient = this.redisService.redis

      await redisClient.set(
        `wallet:${operation.userId}:balance`,
        updatedWallet.balance,
      )

      this.logger.log(
        `[WALLET SYNC OK] +${operation.amount} coins a User:${operation.userId} sincronizado en Redis`,
      )

      return updatedWallet
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          `El usuario con ID ${userId} no existe en el sistema`,
        )
      }

      this.logger.error(
        `Error al agregar monedas al usuario ${userId}`,
        error.stack,
      )
      throw new InternalServerErrorException(
        'No se pudo procesar la recarga de monedas',
      )
    }
  }

  /**
   * Resta monedas verificando saldo a nivel Base de Datos para evitar Race Conditions
   */
  async subtractCoins(
    operation: WalletOperation,
    txClient?: Prisma.TransactionClient,
  ): Promise<Wallet> {
    const { userId, amount, type, description, referenceId } = operation

    const client = txClient || this.prisma

    if (amount <= 0) {
      throw new BadRequestException(
        'El monto a descontar debe ser mayor a cero',
      )
    }

    try {
      const executeOperation = async (prismaTx: Prisma.TransactionClient) => {
        const wallet = await prismaTx.wallet.update({
          where: {
            userId: userId,
            balance: { gte: amount },
          },
          data: { balance: { decrement: amount } },
        })

        await prismaTx.coinTransaction.create({
          data: {
            walletId: wallet.id,
            amount: -amount,
            type: type,
            description: description,
            referenceId: referenceId || null,
          },
        })

        return wallet
      }

      let updatedWallet: Wallet

      if (txClient) {
        updatedWallet = await executeOperation(txClient)
      } else {
        updatedWallet = await this.prisma.$transaction(async (newTx) =>
          executeOperation(newTx),
        )
      }

      const redisClient = this.redisService.redis
      await redisClient.set(`wallet:${userId}:balance`, updatedWallet.balance)

      this.logger.log(
        `[WALLET SYNC OK] -${amount} coins descontadas a User:${userId} sincronizado en Redis`,
      )

      return updatedWallet
    } catch (prismaError) {
      if (prismaError.code === 'P2025') {
        throw new BadRequestException(
          'Saldo insuficiente para realizar esta operación',
        )
      }
      throw prismaError
    }
  }

  /**
   * Consulta de saldo rápida externa (Redis-First)
   */
  async getBalance(userId: string): Promise<number> {
    if (!userId) {
      throw new BadRequestException(
        'El userId es requerido para consultar el saldo.',
      )
    }

    const redisClient = this.redisService.redis
    const cacheKey = `wallet:${userId}:balance`

    const cachedBalance = await redisClient.get(cacheKey)

    if (cachedBalance !== null) {
      return parseInt(cachedBalance, 10)
    }

    // fallback
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: { balance: true },
    })

    if (!wallet) {
      throw new BadRequestException(
        'Billetera no encontrada para el usuario especificado.',
      )
    }

    await redisClient.set(cacheKey, wallet.balance)

    return wallet.balance
  }
}
