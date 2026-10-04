import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { WalletService } from '../wallet/wallet.service'
import {
  STREAK_CONFIG
} from './constants/streak.constants'
import { StreakTimelineItem } from './interfaces/StrakeTimelineItem.interfaces'
import { SPECIAL_GIFTS, TIER_MULTIPLIERS } from 'src/subscriptions/constants/subscription-rewards.constant';

@Injectable()
export class StreaksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
  ) { }

  async handleAutoCheckIn(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        currentStreak: true,
        lastCheckIn: true,
        streakRewardClaimed: true,
      },
    });

    if (!user) throw new BadRequestException('Usuario no encontrado');

    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
    });

    let newStreak = 1;
    let shouldIncrement = false;

    if (user.lastCheckIn) {
      const lastCheckInStr = user.lastCheckIn.toLocaleDateString('en-CA', {
        timeZone: 'America/Argentina/Buenos_Aires',
      });
      const diffDays = Math.floor(
        (Date.parse(todayStr) - Date.parse(lastCheckInStr)) /
        (1000 * 60 * 60 * 24),
      );

      if (diffDays === 0) {
        return {
          incremented: false,
          currentStreak: user.currentStreak,
          canClaimReward: !user.streakRewardClaimed,
        };
      }

      if (diffDays === 1) {
        newStreak = user.currentStreak + 1;
        shouldIncrement = true;
      } else {
        newStreak = 1;
        shouldIncrement = true;
      }
    } else {
      shouldIncrement = true;
    }

    if (shouldIncrement) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          currentStreak: newStreak,
          lastCheckIn: now,
          streakRewardClaimed: false,
        },
      });
    }

    return {
      incremented: shouldIncrement,
      currentStreak: newStreak,
      canClaimReward: true,
    };
  }

  async claimDailyReward(userId: string, userTier: string = 'FREE') {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentStreak: true, streakRewardClaimed: true },
    });

    if (!user) throw new BadRequestException('Usuario no encontrado');
    if (user.streakRewardClaimed) {
      throw new BadRequestException('Ya reclamaste el premio de hoy, campeón.');
    }

    const streakDayForCalculation = Math.min(
      user.currentStreak,
      STREAK_CONFIG.MAX_GROWTH_DAY,
    );
    const baseReward = Math.floor(
      STREAK_CONFIG.BASE_REWARD *
      Math.pow(STREAK_CONFIG.GROWTH_RATE, streakDayForCalculation - 1),
    );

    const multiplier = TIER_MULTIPLIERS[userTier] || 1.0;
    const baseCoinReward = Math.floor(baseReward * multiplier);

    const giftsForDay = SPECIAL_GIFTS[user.currentStreak];
    const specialGiftDef = giftsForDay
      ? giftsForDay[userTier] || giftsForDay['FREE']
      : null;

    let finalTotalCoins = baseCoinReward;
    let cosmeticAwardedMessage: string | null = null;

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { streakRewardClaimed: true },
      });

      if (specialGiftDef) {
        const storeItem = await tx.storeItem.findUnique({
          where: { assetId: specialGiftDef.assetId },
        });

        if (storeItem) {
          const isPermanent = [
            'NAME_COLOR',
            'BANNER',
            'CHAT_BUBBLE',
            'STICKER_PACK',
          ].includes(storeItem.type);

          const existingInventory = await tx.userInventory.findUnique({
            where: { userId_itemId: { userId, itemId: storeItem.id } },
          });

          if (isPermanent && existingInventory) {
            const compensationCoins = Math.floor(storeItem.price * 0.6);
            finalTotalCoins += compensationCoins;
            cosmeticAwardedMessage = `${storeItem.name} (Ya lo tenías. Compensación: +${compensationCoins} monedas)`;
          } else {
            await tx.userInventory.upsert({
              where: {
                userId_itemId: { userId, itemId: storeItem.id },
              },
              update: {
                quantity: { increment: 1 },
              },
              create: {
                userId,
                itemId: storeItem.id,
                quantity: 1,
              },
            });
            cosmeticAwardedMessage = storeItem.name;
          }
        }
      }

      await this.walletService.addCoins({
        userId,
        amount: finalTotalCoins,
        type: 'STREAK_REWARD',
        description: `Premio diario por racha del Día ${user.currentStreak}`,
      });
    });

    return {
      status: 'success',
      coinsAwarded: finalTotalCoins,
      cosmeticAwarded: cosmeticAwardedMessage,
      currentStreak: user.currentStreak,
    };
  }

  async getStreakTimeline(userId: string, userTier: string = 'FREE') {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentStreak: true, streakRewardClaimed: true },
    });

    if (!user) throw new BadRequestException('Usuario no encontrado');

    const current = user.currentStreak || 1;
    const claimedToday = user.streakRewardClaimed;

    const cycle = Math.floor((current - 1) / 30);
    const startDay = cycle * 30 + 1; 

    const timeline: StreakTimelineItem[] = [];
    const multiplier = TIER_MULTIPLIERS[userTier] || 1.0;
    const assetIdsToFetch: string[] = [];

    for (let i = 0; i < 30; i++) {
      const dayNum = startDay + i;

      const streakDayForCalculation = Math.min(
        dayNum,
        STREAK_CONFIG.MAX_GROWTH_DAY,
      );

      const baseReward = Math.floor(
        STREAK_CONFIG.BASE_REWARD *
        Math.pow(STREAK_CONFIG.GROWTH_RATE, streakDayForCalculation - 1),
      );
      const estimatedCoins = Math.floor(baseReward * multiplier);

      const giftsForDay = SPECIAL_GIFTS[dayNum];
      const specialGiftDef = giftsForDay
        ? giftsForDay[userTier] || giftsForDay['FREE']
        : null;

      if (specialGiftDef) {
        assetIdsToFetch.push(specialGiftDef.assetId);
      }

      let status: 'completed' | 'current' | 'upcoming' = 'upcoming';
      if (dayNum < current) {
        status = 'completed';
      } else if (dayNum === current) {
        status = 'current';
      }

      timeline.push({
        dayNumber: dayNum,
        coins: estimatedCoins,
        hasSpecialGift: !!specialGiftDef,
        giftAssetId: specialGiftDef ? specialGiftDef.assetId : null,
        giftType: specialGiftDef ? specialGiftDef.type : null,
        status,
        giftName: null,
      });
    }

    if (assetIdsToFetch.length > 0) {
      const storeItems = await this.prisma.storeItem.findMany({
        where: { assetId: { in: assetIdsToFetch } },
        select: { assetId: true, name: true },
      });

      const itemsMap = storeItems.reduce((acc, item) => {
        acc[item.assetId] = item;
        return acc;
      }, {} as Record<string, { assetId: string; name: string }>);

      timeline.forEach((day) => {
        if (day.giftAssetId && itemsMap[day.giftAssetId]) {
          day.giftName = itemsMap[day.giftAssetId].name;
        }
      });
    }

    return {
      currentStreak: current,
      streakRewardClaimed: claimedToday,
      userTier,
      timeline,
    };
  }
}
