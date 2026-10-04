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
  UPGRADE_COINS_PER_DAY_MAP,
  SUNDAY_VIP_UPGRADE_DISCOUNT_PERCENTAGE,
  SUNDAY_VIP_DISCOUNT_PERCENTAGE,
  PROMO_MESSAGES

} from '../constants/subscription.constants'
import { SubscriptionPricingModel } from '../interfaces/mercado-pago.interface'

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)


@Injectable()
export class SubscriptionPricingService {
  private readonly logger = new Logger(SubscriptionPricingService.name)

  constructor(private readonly prisma: PrismaService) { }

  /**
   * CÁLCULO DE PRECIOS DINÁMICOS
   */
  calculateCurrentPrice(
    plan: SubscriptionPlan,
    userTier: SubscriptionTier | null = null,
  ): SubscriptionPricingModel {
    const basePrice = plan.basePriceARS

    const nowInArgentina = dayjs().tz('America/Argentina/Buenos_Aires')
    const dayOfWeek = nowInArgentina.day()

    let discountPercentage = 0
    let promoMessage: string | null = null

    const expiresAt = nowInArgentina.endOf('day').toDate()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6

    if (dayOfWeek === 0 && plan.tier === SubscriptionTier.TIER_3) {

      if (userTier === SubscriptionTier.TIER_1 || userTier === SubscriptionTier.TIER_2) {
        discountPercentage = SUNDAY_VIP_UPGRADE_DISCOUNT_PERCENTAGE
        promoMessage = PROMO_MESSAGES.SUNDAY_VIP_UPGRADE
      }
      else {
        discountPercentage = SUNDAY_VIP_DISCOUNT_PERCENTAGE
        promoMessage = PROMO_MESSAGES.SUNDAY_VIP
      }

    }
    else if (isWeekend) {
      discountPercentage = WEEKEND_DISCOUNT_PERCENTAGE
      promoMessage = PROMO_MESSAGES.WEEKEND
    }

    const discountAmount = (basePrice * discountPercentage) / 100
    const finalPrice = Math.ceil(basePrice - discountAmount)

    return {
      basePriceARS: basePrice,
      discountedPriceARS: finalPrice,
      discountPercentage,
      isWeekend,
      promoMessage,
      expiresAt: discountPercentage > 0 ? expiresAt : null,
      currency: MERCADO_PAGO_CONSTANTS.CURRENCY,
      appliedAt: nowInArgentina.toDate(),
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
        const pricing = this.calculateCurrentPrice(plan, currentUserTier)

        return {
          id: plan.id,
          tier: plan.tier,
          name: plan.name,
          benefits: plan.benefits,
          pricing,
          isCurrent: currentUserTier === plan.tier,
          upgradeRules: UPGRADE_COINS_PER_DAY_MAP
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
    return tierMap[tier] || 0
  }

  /**
   * CÁLCULO DE BONO DINÁMICO DE UPGRADE
   */
  calculateUpgradeBonus(
    endsAt: Date,
    currentTier: SubscriptionTier,
    newTier: SubscriptionTier,
  ): {
    daysRemaining: number
    bonusCoins: number
    coinsPerDay: number
  } {
    const now = new Date()
    const msRemaining = endsAt.getTime() - now.getTime()
    const daysRemaining = Math.max(
      0,
      Math.ceil(msRemaining / (1000 * 60 * 60 * 24)),
    )

    const transitionKey = `${currentTier}_TO_${newTier}`
    const coinsPerDay = UPGRADE_COINS_PER_DAY_MAP[transitionKey] || 0

    return {
      daysRemaining,
      bonusCoins: daysRemaining * coinsPerDay,
      coinsPerDay,
    }
  }
}