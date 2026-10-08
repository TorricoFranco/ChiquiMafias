import { STREAK_CONFIG } from '../constants/streak.constants'
import { TIER_MULTIPLIERS } from 'src/subscriptions/constants/subscription-rewards.constant'

/**
 * Monedas de la racha para un día dado: crece GROWTH_RATE por día hasta
 * MAX_GROWTH_DAY y después se mantiene, multiplicado según el tier.
 */
export function calculateStreakCoins(streakDay: number, userTier: string) {
  const streakDayForCalculation = Math.min(
    Math.max(streakDay, 1),
    STREAK_CONFIG.MAX_GROWTH_DAY,
  )
  const baseReward = Math.floor(
    STREAK_CONFIG.BASE_REWARD *
      Math.pow(STREAK_CONFIG.GROWTH_RATE, streakDayForCalculation - 1),
  )

  const multiplier = TIER_MULTIPLIERS[userTier] || 1.0
  return Math.floor(baseReward * multiplier)
}
