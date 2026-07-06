import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'
import { BadRequestException } from '@nestjs/common'

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) { }

  // backend: src/inventory/inventory.service.ts

  async getUserInventory(userId: string) {
    const [inventory, user] = await Promise.all([
      this.prisma.userInventory.findMany({
        where: { userId },
        include: { item: true },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { activeNameColorId: true, activeBannerId: true },
      }),
    ])

    return inventory.map((inv) => ({
      ...inv,
      isEquipped:
        inv.itemId === user?.activeNameColorId ||
        inv.itemId === user?.activeBannerId,
    }))
  }

  async equipItem(userId: string, itemId: string) {
    const hasItem = await this.prisma.userInventory.findUnique({
      where: { userId_itemId: { userId, itemId } },
      include: { item: true },
    })

    if (!hasItem) throw new BadRequestException('No tenés este artículo')

    const itemType = hasItem.item.type

    if (itemType === 'NAME_COLOR') {
      await this.prisma.user.update({
        where: { id: userId },
        data: { activeNameColorId: itemId },
      })

      await this.redisService.redis.set(
        `user:cosmetics:${userId}:color`,
        hasItem.item.assetId,
      )
      return { status: 'ok', equipped: 'NAME_COLOR' }
    }

    if (itemType === 'BANNER') {
      await this.prisma.user.update({
        where: { id: userId },
        data: { activeBannerId: itemId },
      })

      await this.redisService.redis.set(
        `user:cosmetics:${userId}:banner`,
        hasItem.item.assetId,
        'EX',
        86400,
      )
      return { status: 'ok', equipped: 'BANNER' }
    }

    throw new BadRequestException('Este tipo de artículo no se puede equipar')
  }

  async unequipItem(userId: string, itemType: 'NAME_COLOR' | 'BANNER') {
    if (itemType === 'NAME_COLOR') {
      await this.prisma.user.update({
        where: { id: userId },
        data: { activeNameColorId: null },
      })
      // Borramos de Redis para que el chat use el color base
      await this.redisService.redis.del(`user:cosmetics:${userId}:color`)
      return { status: 'ok', unequipped: 'NAME_COLOR' }
    }

    if (itemType === 'BANNER') {
      await this.prisma.user.update({
        where: { id: userId },
        data: { activeBannerId: null },
      })
      await this.redisService.redis.del(`user:cosmetics:${userId}:banner`)
      return { status: 'ok', unequipped: 'BANNER' }
    }

    throw new BadRequestException('Tipo de artículo inválido')
  }

  async consumeItem(userId: string, itemType: 'MEGAPHONE') {
    const userInv = await this.prisma.userInventory.findFirst({
      where: {
        userId,
        item: { type: itemType },
      },
      include: { item: true },
    })

    if (!userInv || userInv.quantity <= 0) {
      throw new BadRequestException(
        'No tenés unidades disponibles de este artículo, pa.',
      )
    }

    if (userInv.quantity === 1) {
      await this.prisma.userInventory.delete({
        where: { id: userInv.id },
      })
    } else {
      await this.prisma.userInventory.update({
        where: { id: userInv.id },
        data: { quantity: { decrement: 1 } },
      })
    }

    return { status: 'ok', remaining: userInv.quantity - 1 }
  }
}
