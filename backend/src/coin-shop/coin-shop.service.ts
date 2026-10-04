import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { MercadoPagoService } from '../mercado-pago/mercado-pago.service'
import { WalletService } from '../wallet/wallet.service'
import { ConfigService } from '@nestjs/config'
import { CreatePackDto } from './dto/create-pack.dto'
import { UpdatePackDto } from './dto/update-pack.dto'
import { CoinOrderStatus, TransactionType } from '@prisma/client'

@Injectable()
export class CoinShopService {
  private readonly logger = new Logger(CoinShopService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly mercadoPagoService: MercadoPagoService,
    private readonly walletService: WalletService,
  ) { }

  async buyPack(userId: string, packId: string) {
    const pack = await this.prisma.coinPack.findUnique({ where: { id: packId } })
    if (!pack || !pack.isActive) {
      throw new BadRequestException('El pack de monedas seleccionado no está disponible')
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

    const mpConfig = this.mercadoPagoService.getMercadoPagoConfig();

    const frontendUrl = mpConfig.FRONTEND_URL || 'https://www.chiquimafias.com';

    const notificationUrl = mpConfig.WEBHOOK_URL;

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

    this.logger.debug(`[MP URLs] Success URL generada: ${preferencePayload.back_urls.success}`);

    try {
      const preference = await this.mercadoPagoService.createPreference(preferencePayload)

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
      this.logger.error(`Error al crear preferencia de MP para orden ${order.id}`, error?.response?.data || error)
      await this.prisma.coinOrder.update({
        where: { id: order.id },
        data: { status: CoinOrderStatus.REJECTED },
      })
      throw new BadRequestException('No se pudo generar la preferencia de pago en Mercado Pago')
    }
  }

  async processPaymentWebhook(paymentData: any): Promise<boolean> {
    const externalRef = paymentData.external_reference
    if (!externalRef || !externalRef.startsWith('coin_order_')) {
      return false 
    }

    this.logger.log(`Procesando pago de pack de monedas para ref: ${externalRef}`)

    const order = await this.prisma.coinOrder.findUnique({
      where: { mpExternalRef: externalRef },
    })

    if (!order) {
      this.logger.warn(`No se encontró la orden de compra para externalRef: ${externalRef}`)
      return false
    }

    if (order.status === CoinOrderStatus.APPROVED) {
      this.logger.log(`La orden ${order.id} ya fue procesada anteriormente.`)
      return true
    }

    const status = paymentData.status

    if (status === 'approved') {
      await this.prisma.coinOrder.update({
        where: { id: order.id },
        data: { status: CoinOrderStatus.APPROVED },
      })

      await this.walletService.addCoins({
        userId: order.userId,
        amount: order.coinsToCredit,
        type: TransactionType.MERCADO_PAGO_BUY,
        description: `Compra de Pack de Monedas (${order.coinsToCredit} monedas)`,
        referenceId: order.id,
      })

      this.logger.log(`Monedas acreditadas con éxito (${order.coinsToCredit}) al usuario ${order.userId}`)
      return true
    } else if (status === 'rejected' || status === 'cancelled') {
      await this.prisma.coinOrder.update({
        where: { id: order.id },
        data: { status: CoinOrderStatus.REJECTED },
      })
      this.logger.log(`Orden ${order.id} marcada como REJECTED por estado de pago MP: ${status}`)
      return true
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
