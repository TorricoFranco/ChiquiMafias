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
  SUBSCRIPTION_CYCLE_DAYS,
  SUNDAY_VIP_UPGRADE_DISCOUNT_PERCENTAGE,
  SUNDAY_VIP_DISCOUNT_PERCENTAGE,
  PROMO_MESSAGES,
} from '../constants/subscription.constants'
import { COIN_VALUE_ARS } from 'src/wallet/constants/wallet.constants'
import { SubscriptionPricingModel } from '../interfaces/mercado-pago.interface'

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

@Injectable()
export class SubscriptionPricingService {
  private readonly logger = new Logger(SubscriptionPricingService.name)

  constructor(private readonly prisma: PrismaService) {}

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
      if (
        userTier === SubscriptionTier.TIER_1 ||
        userTier === SubscriptionTier.TIER_2
      ) {
        discountPercentage = SUNDAY_VIP_UPGRADE_DISCOUNT_PERCENTAGE
        promoMessage = PROMO_MESSAGES.SUNDAY_VIP_UPGRADE
      } else {
        discountPercentage = SUNDAY_VIP_DISCOUNT_PERCENTAGE
        promoMessage = PROMO_MESSAGES.SUNDAY_VIP
      }
    } else if (isWeekend) {
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

      const upgradeRules = this.buildUpgradeRules(activePlans)

      return activePlans.map((plan) => {
        const pricing = this.calculateCurrentPrice(plan, currentUserTier)

        return {
          id: plan.id,
          tier: plan.tier,
          name: plan.name,
          benefits: plan.benefits,
          pricing,
          isCurrent: currentUserTier === plan.tier,
          upgradeRules,
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
   * Monedas por día que vale un plan: su precio diario convertido a monedas.
   */
  getUpgradeCoinsPerDay(planPriceARS: number): number {
    return Math.round(planPriceARS / SUBSCRIPTION_CYCLE_DAYS / COIN_VALUE_ARS)
  }

  /**
   * Monedas por día del bono de cada upgrade posible (`TIER_X_TO_TIER_Y`).
   * Dependen solo del plan de origen: se devuelven los días que no se usaron.
   */
  buildUpgradeRules(plans: SubscriptionPlan[]): Record<string, number> {
    const rules: Record<string, number> = {}
    for (const from of plans) {
      for (const to of plans) {
        if (this.getTierValue(to.tier) > this.getTierValue(from.tier)) {
          rules[`${from.tier}_TO_${to.tier}`] = this.getUpgradeCoinsPerDay(
            from.basePriceARS,
          )
        }
      }
    }
    return rules
  }

  /**
   * CÁLCULO DE BONO DE UPGRADE: los días restantes del plan viejo, devueltos en monedas
   */
  calculateUpgradeBonus(
    endsAt: Date,
    oldPlanPriceARS: number,
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

    const coinsPerDay = this.getUpgradeCoinsPerDay(oldPlanPriceARS)

    return {
      daysRemaining,
      bonusCoins: daysRemaining * coinsPerDay,
      coinsPerDay,
    }
  }
}
