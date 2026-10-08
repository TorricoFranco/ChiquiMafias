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
import { MAX_COIN_BALANCE } from './constants/wallet.constants'
import { Prisma, Wallet, TransactionType } from '@prisma/client'
import { EventEmitter2 } from '@nestjs/event-emitter'

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatGateway: ChatGateway,
    private readonly redisService: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Agrega monedas de forma atómica y registra la transacción.
   * Con `txClient` corre dentro de la transacción de quien llama y no toca Redis:
   * quien llama sincroniza con `syncBalanceCache` después del commit.
   */
  async addCoins(
    operation: WalletOperation,
    txClient?: Prisma.TransactionClient,
  ): Promise<Wallet> {
    const { userId, amount, type, description } = operation

    if (amount <= 0) {
      throw new BadRequestException('El monto a agregar debe ser mayor a cero')
    }

    if (txClient) {
      const { wallet } = await this.creditInTx(txClient, operation)
      return wallet
    }

    try {
      const { wallet, amountAdded } = await this.prisma.$transaction((tx) =>
        this.creditInTx(tx, operation),
      )

      await this.syncBalanceCache(userId, wallet.balance)

      if (type === TransactionType.ADMIN_GIFT) {
        this.eventEmitter.emit('wallet.admin_gift', {
          userId: wallet.userId,
          amount: amountAdded,
          description: description,
          newBalance: wallet.balance,
        })
      }

      return wallet
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

  private async creditInTx(
    tx: Prisma.TransactionClient,
    operation: WalletOperation,
  ): Promise<{ wallet: Wallet; amountAdded: number }> {
    const {
      userId,
      amount,
      type,
      description,
      referenceId,
      enforceCap = true,
    } = operation

    // Lock de fila: un débito o crédito concurrente espera al commit en vez de pisar el saldo
    const [locked] = await tx.$queryRaw<{ balance: number }[]>`
      SELECT balance FROM "Wallet" WHERE "userId" = ${userId} FOR UPDATE`

    // Una wallet nueva arranca con las 1000 monedas de regalo
    const previousBalance = locked ? locked.balance : 1000
    const cappedBalance = enforceCap
      ? Math.min(previousBalance + amount, MAX_COIN_BALANCE)
      : previousBalance + amount
    // Lo acreditado sin tope y los pagos de apuestas pueden dejar el saldo
    // arriba del tope: el recorte nunca lo baja.
    const newBalance = Math.max(previousBalance, cappedBalance)
    const amountAdded = newBalance - previousBalance

    const wallet = locked
      ? await tx.wallet.update({
          where: { userId },
          data: { balance: newBalance },
        })
      : await tx.wallet.create({ data: { userId, balance: newBalance } })

    if (amountAdded > 0) {
      await tx.coinTransaction.create({
        data: {
          walletId: wallet.id,
          amount: amountAdded,
          type: type,
          description: description,
          referenceId: referenceId || null,
        },
      })
    }

    this.logger.log(
      `[WALLET DB OK] +${amountAdded} coins a User:${userId} por ${type}. Balance final: ${newBalance}`,
    )
    return { wallet, amountAdded }
  }

  /**
   * Descuenta hasta donde alcance el saldo: para reversas de pagos (reembolsos y
   * contracargos), donde el usuario pudo haber gastado parte de lo acreditado.
   * Corre en la transacción de quien llama y no toca Redis.
   */
  async debitUpTo(
    operation: WalletOperation,
    tx: Prisma.TransactionClient,
  ): Promise<{ debited: number; shortfall: number }> {
    const { userId, amount, type, description, referenceId } = operation

    if (amount <= 0) {
      throw new BadRequestException(
        'El monto a descontar debe ser mayor a cero',
      )
    }

    const [locked] = await tx.$queryRaw<{ id: string; balance: number }[]>`
      SELECT id, balance FROM "Wallet" WHERE "userId" = ${userId} FOR UPDATE`

    const debited = locked ? Math.min(locked.balance, amount) : 0

    if (debited > 0) {
      await tx.wallet.update({
        where: { userId },
        data: { balance: { decrement: debited } },
      })
      await tx.coinTransaction.create({
        data: {
          walletId: locked.id,
          amount: -debited,
          type: type,
          description: description,
          referenceId: referenceId || null,
        },
      })
    }

    this.logger.log(
      `[WALLET DB OK] -${debited} de ${amount} coins a User:${userId} por ${type}`,
    )
    return { debited, shortfall: amount - debited }
  }

  /**
   * Alinea la key de Redis con el saldo confirmado en la DB. Llamarlo después del commit.
   */
  async syncBalanceCache(userId: string, balance?: number): Promise<void> {
    let value = balance
    if (value === undefined) {
      const wallet = await this.prisma.wallet.findUnique({
        where: { userId },
        select: { balance: true },
      })
      if (!wallet) return
      value = wallet.balance
    }

    await this.redisService.redis.set(`wallet:${userId}:balance`, value)

    this.logger.log(
      `[WALLET SYNC OK] Balance de User:${userId} actualizado a ${value} en Redis`,
    )
  }

  /**
   * Resta monedas verificando saldo a nivel Base de Datos para evitar Race Conditions.
   * Con `txClient` no toca Redis: quien llama sincroniza con `syncBalanceCache` después del commit.
   */
  async subtractCoins(
    operation: WalletOperation,
    txClient?: Prisma.TransactionClient,
  ): Promise<Wallet> {
    const { userId, amount, type, description, referenceId } = operation

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

      if (txClient) {
        return await executeOperation(txClient)
      }

      const updatedWallet = await this.prisma.$transaction((newTx) =>
        executeOperation(newTx),
      )

      await this.syncBalanceCache(userId, updatedWallet.balance)

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
