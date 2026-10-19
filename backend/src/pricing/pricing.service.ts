import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import {
  PriceChangeLog,
  PriceCurrency,
  PricedEntity,
  Prisma,
  SystemRole,
  UserStatus,
} from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { COIN_VALUE_ARS } from '../wallet/constants/wallet.constants'
import { PRICE_LOG_RECENT_LIMIT } from './constants/pricing.constants'

interface PriceActor {
  id: string
  username: string
}

/**
 * Cambios de precio del presidente: packs de monedas, ítems de la tienda y planes
 * de suscripción. Toda escritura audita en `PriceChangeLog` dentro de la misma
 * transacción que el update.
 */
@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name)

  constructor(private readonly prisma: PrismaService) {}

  /** Todo lo que el panel de Precios necesita, en una sola llamada. */
  async getPricingOverview() {
    const now = new Date()

    const [
      coinPacks,
      storeItems,
      subscriptionPlans,
      activeDiscounts,
      recentChanges,
    ] = await Promise.all([
      this.prisma.coinPack.findMany({
        select: {
          id: true,
          name: true,
          coinsAmount: true,
          bonusCoins: true,
          priceARS: true,
          isActive: true,
          isPopular: true,
        },
        orderBy: { priceARS: 'asc' },
      }),
      this.prisma.storeItem.findMany({
        select: {
          id: true,
          name: true,
          type: true,
          assetId: true,
          price: true,
          isActive: true,
          isPurchasable: true,
        },
        orderBy: [{ type: 'asc' }, { price: 'asc' }],
      }),
      this.prisma.subscriptionPlan.findMany({
        select: {
          id: true,
          tier: true,
          name: true,
          basePriceARS: true,
          isActive: true,
        },
        orderBy: { basePriceARS: 'asc' },
      }),
      this.prisma.storeDiscount.findMany({
        where: {
          isActive: true,
          startDate: { lte: now },
          endDate: { gte: now },
        },
        select: {
          id: true,
          name: true,
          percentage: true,
          scope: true,
          targetType: true,
          targetItemId: true,
          endDate: true,
        },
      }),
      this.prisma.priceChangeLog.findMany({
        take: PRICE_LOG_RECENT_LIMIT,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          entity: true,
          entityId: true,
          entityName: true,
          oldPrice: true,
          newPrice: true,
          currency: true,
          changedByUsername: true,
          createdAt: true,
        },
      }),
    ])

    return {
      coinPacks,
      storeItems,
      subscriptionPlans,
      activeDiscounts,
      recentChanges,
      coinValueARS: COIN_VALUE_ARS,
    }
  }

  async updateCoinPackPrice(actorId: string, id: string, priceARS: number) {
    const actor = await this.assertPresidentInDb(actorId)

    const result = await this.prisma.$transaction(async (tx) => {
      const pack = await tx.coinPack.findUnique({
        where: { id },
        select: { id: true, name: true, priceARS: true },
      })
      if (!pack) throw new NotFoundException('El pack de monedas no existe')

      if (pack.priceARS === priceARS) {
        const current = await tx.coinPack.findUniqueOrThrow({ where: { id } })
        return { entity: current, change: null, changed: false }
      }

      const { count } = await tx.coinPack.updateMany({
        where: { id, priceARS: pack.priceARS },
        data: { priceARS },
      })
      this.assertNotRaced(count)

      const change = await this.logPriceChange(tx, {
        entity: PricedEntity.COIN_PACK,
        entityId: pack.id,
        entityName: pack.name,
        oldPrice: pack.priceARS,
        newPrice: priceARS,
        currency: PriceCurrency.ARS,
        actor,
      })

      const current = await tx.coinPack.findUniqueOrThrow({ where: { id } })
      return { entity: current, change, changed: true }
    })

    this.logChange(result.change, actor)
    return result
  }

  async updateStoreItemPrice(actorId: string, id: string, price: number) {
    const actor = await this.assertPresidentInDb(actorId)

    const result = await this.prisma.$transaction(async (tx) => {
      const item = await tx.storeItem.findUnique({
        where: { id },
        select: { id: true, name: true, price: true },
      })
      if (!item) throw new NotFoundException('El ítem de la tienda no existe')

      if (item.price === price) {
        const current = await tx.storeItem.findUniqueOrThrow({ where: { id } })
        return { entity: current, change: null, changed: false }
      }

      const { count } = await tx.storeItem.updateMany({
        where: { id, price: item.price },
        data: { price },
      })
      this.assertNotRaced(count)

      const change = await this.logPriceChange(tx, {
        entity: PricedEntity.STORE_ITEM,
        entityId: item.id,
        entityName: item.name,
        oldPrice: item.price,
        newPrice: price,
        currency: PriceCurrency.COINS,
        actor,
      })

      const current = await tx.storeItem.findUniqueOrThrow({ where: { id } })
      return { entity: current, change, changed: true }
    })

    this.logChange(result.change, actor)
    return result
  }

  async updateSubscriptionPlanPrice(
    actorId: string,
    id: string,
    basePriceARS: number,
  ) {
    const actor = await this.assertPresidentInDb(actorId)

    const result = await this.prisma.$transaction(async (tx) => {
      const plan = await tx.subscriptionPlan.findUnique({
        where: { id },
        select: { id: true, name: true, basePriceARS: true },
      })
      if (!plan) throw new NotFoundException('El plan de suscripción no existe')

      if (plan.basePriceARS === basePriceARS) {
        const current = await tx.subscriptionPlan.findUniqueOrThrow({
          where: { id },
        })
        return { entity: current, change: null, changed: false }
      }

      const { count } = await tx.subscriptionPlan.updateMany({
        where: { id, basePriceARS: plan.basePriceARS },
        data: { basePriceARS },
      })
      this.assertNotRaced(count)

      const change = await this.logPriceChange(tx, {
        entity: PricedEntity.SUBSCRIPTION_PLAN,
        entityId: plan.id,
        entityName: plan.name,
        oldPrice: plan.basePriceARS,
        newPrice: basePriceARS,
        currency: PriceCurrency.ARS,
        actor,
      })

      const current = await tx.subscriptionPlan.findUniqueOrThrow({
        where: { id },
      })
      return { entity: current, change, changed: true }
    })

    this.logChange(result.change, actor)
    return result
  }

  /**
   * El rol del `RolesGuard` sale del JWT, así que alguien a quien le bajaron el rol
   * sigue pasando el guard hasta que expire su access token. Acá se vuelve a leer de
   * la DB antes de tocar un precio.
   */
  private async assertPresidentInDb(actorId: string): Promise<PriceActor> {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: {
        id: true,
        username: true,
        role: true,
        status: true,
      },
    })

    if (
      !actor ||
      actor.status !== UserStatus.ACTIVE ||
      actor.role !== SystemRole.PRESIDENT
    ) {
      this.logger.warn(
        `[Precios] Cambio rechazado: el usuario ${actorId} no es PRESIDENT activo en la DB`,
      )
      throw new ForbiddenException({
        message: 'Solo el presidente puede cambiar precios.',
        code: 'PRICE_CHANGE_FORBIDDEN',
      })
    }

    // Nunca el email: el log es append-only y se devuelve en GET /pricing/admin.
    return { id: actor.id, username: actor.username ?? actor.id }
  }

  /**
   * El update es condicional sobre el precio que se leyó: si otro cambio se aplicó
   * en el medio, no afecta ninguna fila y se aborta sin dejar un log con el precio
   * viejo equivocado.
   */
  private assertNotRaced(count: number): void {
    if (count === 0) {
      throw new ConflictException(
        'Otro cambio de precio se aplicó primero. Recargá el panel y volvé a intentar.',
      )
    }
  }

  private logPriceChange(
    tx: Prisma.TransactionClient,
    data: {
      entity: PricedEntity
      entityId: string
      entityName: string
      oldPrice: number
      newPrice: number
      currency: PriceCurrency
      actor: PriceActor
    },
  ) {
    const { actor, ...change } = data

    return tx.priceChangeLog.create({
      data: {
        ...change,
        changedById: actor.id,
        changedByUsername: actor.username,
      },
    })
  }

  private logChange(change: PriceChangeLog | null, actor: PriceActor): void {
    if (!change) return

    this.logger.log(
      `[Precios] ${change.entity} ${change.entityId} (${change.entityName}): ${change.oldPrice} → ${change.newPrice} ${change.currency} por @${actor.username}`,
    )
  }
}
