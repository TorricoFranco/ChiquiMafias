import { Injectable, Logger } from '@nestjs/common'
import { Prisma, TransactionType } from '@prisma/client'
import { SUBSCRIPTION_GIFTS } from './constants/subscription-rewards.constant'
import { WalletService } from '../wallet/wallet.service'

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

  constructor(private readonly walletService: WalletService) {}

  /**
   * Entrega el regalo de alta del tier dentro de la transacción de quien llama.
   * No toca Redis: quien llama sincroniza el saldo después del commit.
   */
  async grantRewards(
    userId: string,
    tier: string,
    tx: Prisma.TransactionClient,
  ) {
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
      const baseCoins = rewards.coins || 0

      // Es parte de lo que se pagó: no se recorta al tope
      await this.walletService.addCoins(
        {
          userId,
          amount: totalCoinsToGive,
          type: TransactionType.SUBSCRIPTION_REWARD,
          description: `Regalo por suscripción ${tier}${totalCoinsToGive > baseCoins ? ' (Incluye compensación por ítems repetidos)' : ''}`,
          enforceCap: false,
        },
        tx,
      )
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
