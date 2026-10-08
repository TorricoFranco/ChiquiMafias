import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { MercadoPagoService } from '../mercado-pago/mercado-pago.service'
import { WalletService } from '../wallet/wallet.service'
import { ConfigService } from '@nestjs/config'
import { CreatePackDto } from './dto/create-pack.dto'
import { UpdatePackDto } from './dto/update-pack.dto'
import { CoinOrderStatus, Prisma, TransactionType } from '@prisma/client'

// Otro evento ya registró este pago. Se distingue de cualquier otro P2002 de la
// transacción (por ejemplo, dos créditos simultáneos creando la misma wallet), que
// tiene que fallar para que MP reintente.
class PaymentAlreadyRecordedError extends Error {}

const recordPayment = async (
  tx: Prisma.TransactionClient,
  paymentId: string,
) => {
  try {
    await tx.processedPayment.create({ data: { paymentId } })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new PaymentAlreadyRecordedError(paymentId)
    }
    throw error
  }
}

@Injectable()
export class CoinShopService {
  private readonly logger = new Logger(CoinShopService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly mercadoPagoService: MercadoPagoService,
    private readonly walletService: WalletService,
  ) {}

  async buyPack(userId: string, packId: string) {
    const pack = await this.prisma.coinPack.findUnique({
      where: { id: packId },
    })
    if (!pack || !pack.isActive) {
      throw new BadRequestException(
        'El pack de monedas seleccionado no está disponible',
      )
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new NotFoundException('Usuario no encontrado')
    }

    const coinsToCredit = pack.coinsAmount + pack.bonusCoins

    const order = await this.prisma.coinOrder.create({
      data: {
        userId,
        packId: pack.id,
        status: CoinOrderStatus.PENDING,
        finalPriceARS: pack.priceARS,
        coinsToCredit,
        mpExternalRef: `coin_order_placeholder_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      },
    })

    const realExternalRef = `coin_order_${order.id}`

    await this.prisma.coinOrder.update({
      where: { id: order.id },
      data: { mpExternalRef: realExternalRef },
    })

    const mpConfig = this.mercadoPagoService.getMercadoPagoConfig()

    const frontendUrl = mpConfig.FRONTEND_URL || 'https://www.chiquimafias.com'

    const notificationUrl = mpConfig.WEBHOOK_URL

    const preferencePayload = {
      items: [
        {
          id: pack.id,
          title: `Pack Monedas: ${pack.name} (${coinsToCredit} Monedas)`,
          unit_price: pack.priceARS,
          quantity: 1,
          currency_id: 'ARS',
        },
      ],
      external_reference: realExternalRef,
      payer: {
        email: user.email,
      },
      notification_url: notificationUrl,
      back_urls: {
        success: `${frontendUrl}/shop?status=success&orderId=${order.id}`,
        failure: `${frontendUrl}/shop?status=failure&orderId=${order.id}`,
        pending: `${frontendUrl}/shop?status=pending&orderId=${order.id}`,
      },
      auto_return: 'approved',
    }

    this.logger.debug(
      `[MP URLs] Success URL generada: ${preferencePayload.back_urls.success}`,
    )

    try {
      const preference =
        await this.mercadoPagoService.createPreference(preferencePayload)

      await this.prisma.coinOrder.update({
        where: { id: order.id },
        data: { mpPreferenceId: preference.id },
      })

      return {
        orderId: order.id,
        preferenceId: preference.id,
        initPoint: preference.init_point,
        sandboxInitPoint: preference.sandbox_init_point,
      }
    } catch (error: any) {
      this.logger.error(
        `Error al crear preferencia de MP para orden ${order.id}`,
        error?.response?.data || error,
      )
      await this.prisma.coinOrder.update({
        where: { id: order.id },
        data: { status: CoinOrderStatus.REJECTED },
      })
      throw new BadRequestException(
        'No se pudo generar la preferencia de pago en Mercado Pago',
      )
    }
  }

  async processPaymentWebhook(paymentData: {
    id?: string | number
    status?: string
    external_reference?: string
  }): Promise<boolean> {
    const externalRef = paymentData.external_reference
    if (!externalRef || !externalRef.startsWith('coin_order_')) {
      return false
    }
    if (paymentData.id === undefined || paymentData.id === null) {
      this.logger.warn(
        `Pago de pack sin id para externalRef: ${externalRef}. Ignorado.`,
      )
      return false
    }

    this.logger.log(
      `Procesando pago de pack de monedas para ref: ${externalRef}`,
    )

    const order = await this.prisma.coinOrder.findUnique({
      where: { mpExternalRef: externalRef },
    })

    if (!order) {
      this.logger.warn(
        `No se encontró la orden de compra para externalRef: ${externalRef}`,
      )
      return false
    }

    const status = paymentData.status
    // Qué pago de MP acreditó la orden: una reversa solo descuenta lo de ese pago
    const paymentKey = `coin:${paymentData.id}`

    if (status === 'approved') {
      // MP manda varios eventos por el mismo pago (payment y merchant_order) y reintenta:
      // solo el que logra pasar la orden a APPROVED acredita, en la misma transacción.
      // Una orden REJECTED también puede aprobarse si el usuario reintentó el pago.
      let credited: boolean
      try {
        credited = await this.prisma.$transaction(async (tx) => {
          const { count } = await tx.coinOrder.updateMany({
            where: { id: order.id, status: { not: CoinOrderStatus.APPROVED } },
            data: { status: CoinOrderStatus.APPROVED },
          })
          if (count === 0) return false

          // Unique: un handler en vuelo que leyó "approved" antes de un reembolso
          // choca acá y no vuelve a acreditar el mismo pago
          await recordPayment(tx, paymentKey)

          await this.walletService.addCoins(
            {
              userId: order.userId,
              amount: order.coinsToCredit,
              type: TransactionType.MERCADO_PAGO_BUY,
              description: `Compra de Pack de Monedas (${order.coinsToCredit} monedas)`,
              referenceId: order.id,
              enforceCap: false,
            },
            tx,
          )
          return true
        })
      } catch (error) {
        if (!(error instanceof PaymentAlreadyRecordedError)) throw error
        credited = false
      }

      if (!credited) {
        this.logger.log(`La orden ${order.id} ya fue procesada anteriormente.`)
        return true
      }

      await this.walletService.syncBalanceCache(order.userId)

      this.logger.log(
        `Monedas acreditadas con éxito (${order.coinsToCredit}) al usuario ${order.userId}`,
      )
      return true
    } else if (status === 'rejected' || status === 'cancelled') {
      const { count } = await this.prisma.coinOrder.updateMany({
        where: { id: order.id, status: CoinOrderStatus.PENDING },
        data: { status: CoinOrderStatus.REJECTED },
      })
      if (count > 0) {
        this.logger.log(
          `Orden ${order.id} marcada como REJECTED por estado de pago MP: ${status}`,
        )
      }
      return true
    } else if (status === 'refunded' || status === 'charged_back') {
      return this.reversePaidOrder(order, status, paymentKey)
    }

    return true
  }

  /**
   * Reembolso o contracargo de un pago que acreditó un pack: la orden vuelve a REJECTED
   * (no hay un estado propio en el schema) y se descuenta lo acreditado hasta donde
   * alcance el saldo. Lo que el usuario ya gastó queda logueado para revisión manual.
   * Un pago que no acreditó (por ejemplo, un segundo pago de la misma orden) no descuenta nada.
   */
  private async reversePaidOrder(
    order: { id: string; userId: string; coinsToCredit: number },
    status: string,
    paymentKey: string,
  ): Promise<boolean> {
    const reason = status === 'refunded' ? 'reembolso' : 'contracargo'

    let reversal: { debited: number; shortfall: number } | null
    try {
      reversal = await this.prisma.$transaction(async (tx) => {
        const credit = await tx.processedPayment.findUnique({
          where: { paymentId: paymentKey },
        })
        if (!credit) return null

        // Unique: el mismo reembolso o contracargo no se descuenta dos veces
        await recordPayment(tx, `${paymentKey}:reversal`)

        await tx.coinOrder.updateMany({
          where: { id: order.id, status: CoinOrderStatus.APPROVED },
          data: { status: CoinOrderStatus.REJECTED },
        })

        return this.walletService.debitUpTo(
          {
            userId: order.userId,
            amount: order.coinsToCredit,
            type: TransactionType.MERCADO_PAGO_BUY,
            description: `Reversa de Pack de Monedas por ${reason} (${order.coinsToCredit} monedas)`,
            referenceId: order.id,
          },
          tx,
        )
      })
    } catch (error) {
      if (!(error instanceof PaymentAlreadyRecordedError)) throw error
      reversal = null
    }

    if (!reversal) {
      this.logger.log(
        `El pago de la orden ${order.id} no la había acreditado o ya se revirtió (${reason}).`,
      )
      return true
    }

    await this.walletService.syncBalanceCache(order.userId)

    if (reversal.shortfall > 0) {
      this.logger.error(
        `[Coin Shop] Orden ${order.id} (${reason}): se descontaron ${reversal.debited} de ${order.coinsToCredit} monedas; faltan ${reversal.shortfall} que el usuario ${order.userId} ya gastó. Revisar a mano.`,
      )
    } else {
      this.logger.log(
        `Orden ${order.id} revertida por ${reason}: -${reversal.debited} monedas al usuario ${order.userId}`,
      )
    }
    return true
  }

  async getUserOrders(userId: string) {
    return this.prisma.coinOrder.findMany({
      where: { userId },
      include: { pack: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getActivePacks() {
    return this.prisma.coinPack.findMany({
      where: { isActive: true },
      orderBy: { priceARS: 'asc' },
    })
  }

  async getAllPacksAdmin() {
    return this.prisma.coinPack.findMany({
      orderBy: { createdAt: 'desc' },
    })
  }

  async createPack(dto: CreatePackDto) {
    return this.prisma.coinPack.create({
      data: dto,
    })
  }

  async updatePack(id: string, dto: UpdatePackDto) {
    const pack = await this.prisma.coinPack.findUnique({ where: { id } })
    if (!pack) {
      throw new NotFoundException('Pack de monedas no encontrado')
    }
    return this.prisma.coinPack.update({
      where: { id },
      data: dto,
    })
  }

  async deletePack(id: string) {
    const pack = await this.prisma.coinPack.findUnique({ where: { id } })
    if (!pack) {
      throw new NotFoundException('Pack de monedas no encontrado')
    }
    return this.prisma.coinPack.delete({
      where: { id },
    })
  }
}
