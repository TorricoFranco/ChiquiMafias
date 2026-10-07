import { Injectable, Logger } from '@nestjs/common'
import { SUBSCRIPTION_GIFTS } from './constants/subscription-rewards.constant'

interface AwardedItem {
  name: string
  type: string
  assetId: string
  compensated: boolean
  compensationCoins?: number
}

@Injectable()
export class SubscriptionRewardsService {
  private readonly logger = new Logger(SubscriptionRewardsService.name)

  async grantRewards(userId: string, tier: string, tx: any) {
    const rewards = SUBSCRIPTION_GIFTS[tier]
    if (!rewards) return null

    let totalCoinsToGive = rewards.coins || 0
    const awardedItems: AwardedItem[] = []

    for (const itemDef of rewards.cosmetics) {
      const storeItem = await tx.storeItem.findUnique({
        where: { assetId: itemDef.assetId },
      })

      if (!storeItem) {
        this.logger.warn(`Cosmético no encontrado en DB: ${itemDef.assetId}`)
        continue
      }

      const isPermanent = [
        'STICKER_PACK',
        'NAME_COLOR',
        'BANNER',
        'CHAT_BUBBLE',
      ].includes(storeItem.type)
      const quantityToGive = itemDef.quantity || 1

      const existingInventory = await tx.userInventory.findUnique({
        where: { userId_itemId: { userId, itemId: storeItem.id } },
      })

      if (isPermanent && existingInventory) {
        const compensationCoins = Math.floor(storeItem.price * 0.6)
        totalCoinsToGive += compensationCoins

        awardedItems.push({
          name: storeItem.name,
          type: storeItem.type,
          assetId: storeItem.assetId,
          compensated: true,
          compensationCoins,
        })
      } else {
        await tx.userInventory.upsert({
          where: { userId_itemId: { userId, itemId: storeItem.id } },
          update: { quantity: { increment: quantityToGive } },
          create: { userId, itemId: storeItem.id, quantity: quantityToGive },
        })

        awardedItems.push({
          name: storeItem.name,
          type: storeItem.type,
          assetId: storeItem.assetId,
          compensated: false,
        })
      }
    }

    if (totalCoinsToGive > 0) {
      const wallet = await tx.wallet.update({
        where: { userId },
        data: { balance: { increment: totalCoinsToGive } },
      })

      const baseCoins = rewards.coins || 0

      await tx.coinTransaction.create({
        data: {
          walletId: wallet.id,
          amount: totalCoinsToGive,
          type: 'SUBSCRIPTION_REWARD',
          description: `Regalo por suscripción ${tier}${totalCoinsToGive > baseCoins ? ' (Incluye compensación por ítems repetidos)' : ''}`,
        },
      })
    }

    return {
      tier,
      baseCoins: rewards.coins || 0,
      totalCoinsAwarded: totalCoinsToGive,
      items: awardedItems,
      showAnimation: rewards.showAnimation,
    }
  }
}
