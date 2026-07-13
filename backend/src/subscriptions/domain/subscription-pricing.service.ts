import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common'
import { SubscriptionTier, SubscriptionPlan } from '@prisma/client'
import { PrismaService } from 'src/prisma/prisma.service'
import {
  WEEKEND_DISCOUNT_PERCENTAGE,
  MERCADO_PAGO_CONSTANTS,
  COINS_PER_DAY_UPGRADE,
} from '../constants/subscription.constants'
import { SubscriptionPricingModel } from '../interfaces/mercado-pago.interface'

@Injectable()
export class SubscriptionPricingService {
  // Inicializamos el logger de Nest para este service
  private readonly logger = new Logger(SubscriptionPricingService.name)

  constructor(private readonly prisma: PrismaService) {}

  /**
   * CÁLCULO DE PRECIOS DINÁMICOS
   */
  calculateCurrentPrice(plan: SubscriptionPlan): SubscriptionPricingModel {
    const basePrice = plan.basePriceARS
    const now = new Date()
    const dayOfWeek = now.getDay()

    // Verificar si es fin de semana (viernes 5, sábado 6, domingo 0)
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6
    const hasActivePromotion = false

    const shouldApplyDiscount = isWeekend || hasActivePromotion
    const discountPercentage = shouldApplyDiscount
      ? WEEKEND_DISCOUNT_PERCENTAGE
      : 0

    const discountAmount = (basePrice * discountPercentage) / 100
    const finalPrice = Math.ceil(basePrice - discountAmount)

    return {
      basePriceARS: basePrice,
      discountedPriceARS: finalPrice,
      discountPercentage,
      isWeekend,
      currency: MERCADO_PAGO_CONSTANTS.CURRENCY,
      appliedAt: now,
    }
  }

  /**
   * OBTENER GRILLA DE PLANES (INFORMATIVO FRONTEND)
   */
  async getPlans(currentUserTier: SubscriptionTier | null) {
    try {
      const activePlans = await this.prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: { basePriceARS: 'asc' },
      })

      return activePlans.map((plan) => {
        const pricing = this.calculateCurrentPrice(plan)

        return {
          id: plan.id,
          tier: plan.tier,
          name: plan.name,
          benefits: plan.benefits,
          pricing,
          isCurrent: currentUserTier === plan.tier,
        }
      })
    } catch (error) {
      this.logger.error(`[GetPlans Error] ${error.message}`, error.stack)
      throw new InternalServerErrorException(
        'Error al recuperar la grilla de planes',
      )
    }
  }

  /**
   * Obtener valor numérico del tier para comparaciones
   */
  getTierValue(tier: SubscriptionTier): number {
    const tierMap: Record<SubscriptionTier, number> = {
      TIER_1: 1,
      TIER_2: 2,
      TIER_3: 3,
    }
    return tierMap[tier]
  }

  calculateUpgradeBonus(endsAt: Date): {
    daysRemaining: number
    bonusCoins: number
  } {
    const now = new Date()
    const msRemaining = endsAt.getTime() - now.getTime()
    const daysRemaining = Math.max(
      0,
      Math.ceil(msRemaining / (1000 * 60 * 60 * 24)),
    )

    return {
      daysRemaining,
      bonusCoins: daysRemaining * COINS_PER_DAY_UPGRADE,
    }
  }
}
