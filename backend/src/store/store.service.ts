import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { WalletService } from '../wallet/wallet.service'
import { ChatGateway } from '../chat/chat.gateway'
import { StoreItemResponseDto } from './dto/store-item-response.dto'
import { CreateStoreItemDto } from './dto/create-store-item.dto'
import { CreateStoreDiscountDto } from './dto/create-store-discount.dto'
import { UpdateStoreItemDto } from './dto/update-store-item.dto'
import { StoreItem, Prisma } from '@prisma/client'

@Injectable()
export class StoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly chatGateway: ChatGateway,
  ) { }

  private async getApplicableDiscount(
    item: StoreItem,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    const now = new Date()

    const activeDiscounts = await tx.storeDiscount.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    })

    // 1. Prioridad Máxima: Descuento específico por ID de producto
    // 2. Prioridad Media: Descuento por categoría/tipo (ej: todos los banners)
    // 3. Prioridad Base: Descuento global para toda la tienda
    const discount =
      activeDiscounts.find(
        (d) => d.scope === 'SPECIFIC_ITEM' && d.targetItemId === item.id,
      ) ||
      activeDiscounts.find(
        (d) => d.scope === 'BY_TYPE' && d.targetType === item.type,
      ) ||
      activeDiscounts.find((d) => d.scope === 'ALL')

    if (!discount) {
      return {
        currentPrice: item.price,
        isDiscounted: false,
      }
    }

    const discountAmount = Math.round(item.price * (discount.percentage / 100))
    const currentPrice = Math.max(0, item.price - discountAmount)

    return {
      currentPrice,
      isDiscounted: true,
      discountPercentage: discount.percentage,
      discountName: discount.name,
    }
  }

  /**
   * OBTENER CATÁLOGO DE LA TIENDA
   */
  async getStoreItems(userId?: string): Promise<StoreItemResponseDto[]> {
    const items = await this.prisma.storeItem.findMany({
      where: { isActive: true },
      include: {
        inventories: {
          where: { userId: userId || 'NO_USER' },
        },
      },
    })

    return Promise.all(
      items.map(async (item) => {
        const userInv = item.inventories[0]
        const discountInfo = await this.getApplicableDiscount(item)

        return {
          id: item.id,
          name: item.name,
          description: item.description,
          price: item.price,
          type: item.type,
          assetId: item.assetId,
          isOwned: !!userInv,
          ownedQuantity: userInv ? userInv.quantity : 0,
          currentPrice: discountInfo.currentPrice,
          isDiscounted: discountInfo.isDiscounted,
          discountPercentage: discountInfo.discountPercentage,
          discountName: discountInfo.discountName,
        }
      }),
    )
  }

  async buyItem(userId: string, itemId: string) {
    const { purchase, updatedBalance } = await this.prisma.$transaction(
      async (tx) => {
        const item = await tx.storeItem.findUnique({ where: { id: itemId } })
        if (!item || !item.isActive) {
          throw new NotFoundException('El ítem no está disponible')
        }

        const existingInventory = await tx.userInventory.findUnique({
          where: { userId_itemId: { userId, itemId } },
        })

        if (
          existingInventory &&
          (item.type === 'STICKER_PACK' ||
            item.type === 'NAME_COLOR' ||
            item.type === 'BANNER')
        ) {
          throw new BadRequestException(
            'Ya sos dueño de este beneficio permanente',
          )
        }

        const discountInfo = await this.getApplicableDiscount(item, tx)

        const updatedWallet = await this.walletService.subtractCoins(
          {
            userId,
            amount: discountInfo.currentPrice,
            type: 'STORE_PURCHASE',
            description: `Compra en tienda: ${item.name} ${discountInfo.isDiscounted ? '(Con Descuento)' : ''}`,
          },
          tx,
        )

        let resultInventory
        if (existingInventory) {
          resultInventory = await tx.userInventory.update({
            where: { id: existingInventory.id },
            data: { quantity: { increment: 1 } },
          })
        } else {
          resultInventory = await tx.userInventory.create({
            data: { userId, itemId, quantity: 1 },
          })
        }

        return {
          purchase: resultInventory,
          updatedBalance: updatedWallet.balance,
        }
      },
    )

    this.chatGateway.sendWalletUpdate(userId, updatedBalance)
    return purchase
  }

  async createStoreItem(dto: CreateStoreItemDto) {
    return this.prisma.storeItem.create({ data: dto })
  }

  async updateStoreItem(id: string, dto: UpdateStoreItemDto) {
    const item = await this.prisma.storeItem.findUnique({ where: { id } })
    if (!item)
      throw new NotFoundException('El artículo que buscás modificar no existe.')

    return this.prisma.storeItem.update({
      where: { id },
      data: dto,
    })
  }

  /**
   * SOFT DELETE
   */
  async deleteStoreItem(id: string) {
    const item = await this.prisma.storeItem.findUnique({ where: { id } })
    if (!item)
      throw new NotFoundException('El artículo que buscás eliminar no existe.')

    return this.prisma.storeItem.update({
      where: { id },
      data: { isActive: false },
    })
  }

  async createDiscount(dto: CreateStoreDiscountDto) {
    const start = new Date(dto.startDate)
    const end = new Date(dto.endDate)

    if (end <= start) {
      throw new BadRequestException(
        'La fecha de finalización debe ser posterior a la fecha de inicio.',
      )
    }

    if (dto.scope === 'BY_TYPE' && !dto.targetType) {
      throw new BadRequestException(
        'Para descuentos por tipo, tenés que especificar el campo targetType.',
      )
    }
    if (dto.scope === 'SPECIFIC_ITEM' && !dto.targetItemId) {
      throw new BadRequestException(
        'Para descuentos específicos, tenés que proveer un targetItemId válido.',
      )
    }

    return this.prisma.storeDiscount.create({
      data: {
        name: dto.name,
        percentage: dto.percentage,
        scope: dto.scope,
        targetType: dto.scope === 'BY_TYPE' ? dto.targetType : null,
        targetItemId: dto.scope === 'SPECIFIC_ITEM' ? dto.targetItemId : null,
        startDate: start,
        endDate: end,
        isActive: dto.isActive ?? true,
      },
    })
  }
}
