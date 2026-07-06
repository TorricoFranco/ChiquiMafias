import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { WalletService } from '../wallet/wallet.service'
import {
  STREAK_CONFIG,
  TIER_MULTIPLIERS,
  SPECIAL_GIFTS,
} from './constants/streak.constants'
import { StreakTimelineItem } from './interfaces/StrakeTimelineItem.interfaces'

@Injectable()
export class StreaksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
  ) { }

  /**
   * Evalúa la racha, la incrementa si corresponde, pero NO da monedas
   */
  async handleAutoCheckIn(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        currentStreak: true,
        lastCheckIn: true,
        streakRewardClaimed: true,
      },
    })

    if (!user) throw new BadRequestException('Usuario no encontrado')

    const now = new Date()
    const todayStr = now.toLocaleDateString('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
    })

    let newStreak = 1
    let shouldIncrement = false

    if (user.lastCheckIn) {
      const lastCheckInStr = user.lastCheckIn.toLocaleDateString('en-CA', {
        timeZone: 'America/Argentina/Buenos_Aires',
      })
      const diffDays = Math.floor(
        (Date.parse(todayStr) - Date.parse(lastCheckInStr)) /
        (1000 * 60 * 60 * 24),
      )

      if (diffDays === 0) {
        return {
          incremented: false,
          currentStreak: user.currentStreak,
          canClaimReward: !user.streakRewardClaimed,
        }
      }

      if (diffDays === 1) {
        newStreak = user.currentStreak + 1
        shouldIncrement = true
      } else {
        newStreak = 1
        shouldIncrement = true
      }
    } else {
      shouldIncrement = true
    }

    if (shouldIncrement) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          currentStreak: newStreak,
          lastCheckIn: now,
          streakRewardClaimed: false,
        },
      })
    }

    return {
      incremented: shouldIncrement,
      currentStreak: newStreak,
      canClaimReward: true,
    }
  }

  /**
   * Calcula el premio según su racha y tier, y procesa la transacción atómica.
   */
  async claimDailyReward(userId: string, userTier: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentStreak: true, streakRewardClaimed: true },
    })

    if (!user) throw new BadRequestException('Usuario no encontrado')
    if (user.streakRewardClaimed) {
      throw new BadRequestException('Ya reclamaste el premio de hoy, campeón.')
    }

    const streakDayForCalculation = Math.min(
      user.currentStreak,
      STREAK_CONFIG.MAX_GROWTH_DAY,
    )
    const baseReward = Math.floor(
      STREAK_CONFIG.BASE_REWARD *
      Math.pow(STREAK_CONFIG.GROWTH_RATE, streakDayForCalculation - 1),
    )

    const multiplier = TIER_MULTIPLIERS[userTier] || 1.0
    const finalCoinReward = Math.floor(baseReward * multiplier)

    const specialGift = SPECIAL_GIFTS[user.currentStreak]

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { streakRewardClaimed: true },
      })

      await this.walletService.addCoins({
        userId,
        amount: finalCoinReward,
        type: 'STREAK_REWARD',
        description: `Premio diario por racha del Día ${user.currentStreak}`,
      })

      if (specialGift) {
        await tx.userInventory.upsert({
          where: {
            userId_itemId: { userId, itemId: specialGift.itemId },
          },
          update: {
            quantity: { increment: 1 },
          },
          create: {
            userId,
            itemId: specialGift.itemId,
            quantity: 1,
          },
        })
      }
    })

    return {
      status: 'success',
      coinsAwarded: finalCoinReward,
      cosmeticAwarded: specialGift ? specialGift.itemName : null,
      currentStreak: user.currentStreak,
    }
  }

  /**
   *  camino de recompensas (timeline) de 7 días personalizado para el usuario.
   */
  async getStreakTimeline(userId: string, userTier: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentStreak: true, streakRewardClaimed: true },
    })

    if (!user) throw new BadRequestException('Usuario no encontrado')

    const current = user.currentStreak || 1
    const claimedToday = user.streakRewardClaimed

    let startDay = Math.max(1, current - 1)

    if (current > 2) {
      startDay = current - 1
    }

    const timeline: StreakTimelineItem[] = []
    const multiplier = TIER_MULTIPLIERS[userTier] || 1.0

    for (let i = 0; i < 7; i++) {
      const dayNum = startDay + i

      const streakDayForCalculation = Math.min(
        dayNum,
        STREAK_CONFIG.MAX_GROWTH_DAY,
      )
      const baseReward = Math.floor(
        STREAK_CONFIG.BASE_REWARD *
        Math.pow(STREAK_CONFIG.GROWTH_RATE, streakDayForCalculation - 1),
      )
      const estimatedCoins = Math.floor(baseReward * multiplier)

      const specialGift = SPECIAL_GIFTS[dayNum]

      let status: 'completed' | 'current' | 'upcoming' = 'upcoming'
      if (dayNum < current) {
        status = 'completed'
      } else if (dayNum === current) {
        status = 'current'
      }

      timeline.push({
        dayNumber: dayNum,
        coins: estimatedCoins,
        hasSpecialGift: !!specialGift,
        giftName: specialGift ? specialGift.itemName : null,
        status,
      })
    }

    return {
      currentStreak: current,
      streakRewardClaimed: claimedToday,
      userTier,
      timeline,
    }
  }
}
