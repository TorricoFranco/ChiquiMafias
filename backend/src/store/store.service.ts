import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { WalletService } from '../wallet/wallet.service'
import { ChatGateway } from '../chat/chat.gateway'
import { StoreItemResponseDto } from './dto/store-item-response.dto'
import { CreateStoreItemDto } from './dto/create-store-item.dto'
import { CreateStoreDiscountDto } from './dto/create-store-discount.dto'
import { UpdateStoreItemDto } from './dto/update-store-item.dto'
import { StoreItem, Prisma, ItemType } from '@prisma/client'
import { DYNAMIC_DISCOUNTS } from './constants/store.constants'


//   {
//     name: 'Gloria Albiceleste',
//     description: 'La consagración de Argentina en la Copa América',
//     price: 500,
//     type: ItemType.BANNER,
//     assetId: 'argentina-celebrando-copa-america',
//   },
//   {
//     name: 'Celebración Estelar',
//     description: 'La postura icónica que domina el campo',
//     price: 300,
//     type: ItemType.BANNER,
//     assetId: 'bellingham-celebrcion-brazos-levantados',
//   },
//   {
//     name: 'El Templo',
//     description: 'La Bombonera: donde late el corazón del fútbol',
//     price: 400,
//     type: ItemType.BANNER,
//     assetId: 'estadio-bombonera',
//   },
//   {
//     name: 'Coloso de Núñez',
//     description: 'La inmensidad del Monumental a máxima capacidad',
//     price: 400,
//     type: ItemType.BANNER,
//     assetId: 'estadio-monumental',
//   },
//   {
//     name: 'Eterno D10S',
//     description: 'El beso más sagrado de la historia del fútbol',
//     price: 600,
//     type: ItemType.BANNER,
//     assetId: 'maradona-mundial-beso-copa',
//   },
//   {
//     name: 'Homenaje al Cielo',
//     description: 'La celebración más emotiva del 10',
//     price: 500,
//     type: ItemType.BANNER,
//     assetId: 'messi-celebracion-al-cielo',
//   },
//   {
//     name: 'La Mente Maestra',
//     description: 'La mirada del genio analizando cada jugada',
//     price: 300,
//     type: ItemType.BANNER,
//     assetId: 'messi-pensativo-poster',
//   }
// ];

@Injectable()
export class StoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly chatGateway: ChatGateway,
  ) { }


  async getStoreItemsAll() {
    const items = await this.prisma.storeItem.findMany({
      where: {
        isActive: true,
      },
    });

    return items
  }

  private async getApplicableDiscount(
    item: StoreItem,
    userSubscriptionDiscount: number = 0,
    userSubscriptionTierName: string = 'Suscriptor',
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    const now = new Date();
    const eligibleDiscounts: { name: string; percentage: number }[] = [];

    //descuento por suscripción
    if (userSubscriptionDiscount > 0) {
      eligibleDiscounts.push({
        name: `Beneficio ${userSubscriptionTierName}`,
        percentage: userSubscriptionDiscount,
      });
    }

    //descuentos dinámicos
    if (now.getDay() === 0 && DYNAMIC_DISCOUNTS.SUNDAY.isActive) {
      eligibleDiscounts.push({
        name: DYNAMIC_DISCOUNTS.SUNDAY.name,
        percentage: DYNAMIC_DISCOUNTS.SUNDAY.percentage,
      });
    }

    //descuentos de la base de datos
    const activeDbDiscounts = await tx.storeDiscount.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });

    const applicableDbDiscounts = activeDbDiscounts.filter(d =>
      (d.scope === 'SPECIFIC_ITEM' && d.targetItemId === item.id) ||
      (d.scope === 'BY_TYPE' && d.targetType === item.type) ||
      (d.scope === 'ALL')
    );

    applicableDbDiscounts.forEach(d => {
      eligibleDiscounts.push({ name: d.name, percentage: d.percentage });
    });

    if (eligibleDiscounts.length === 0) {
      return {
        currentPrice: item.price,
        isDiscounted: false,
        discountPercentage: 0,
        discountName: ''
      };
    }

    eligibleDiscounts.sort((a, b) => b.percentage - a.percentage);

    const top2Discounts = eligibleDiscounts.slice(0, 2);

    const totalPercentage = top2Discounts.reduce((acc, curr) => acc + curr.percentage, 0);
    const finalPercentage = Math.min(totalPercentage, 90);

    const discountName = top2Discounts.map(d => d.name).join(' + ');

    const discountAmount = Math.round(item.price * (finalPercentage / 100));
    const currentPrice = Math.max(0, item.price - discountAmount);

    return {
      currentPrice,
      isDiscounted: true,
      discountPercentage: finalPercentage,
      discountName,
    };
  }

  async buyItem(userId: string, itemId: string, quantity: number = 1) {
    if (quantity < 1) throw new BadRequestException('La cantidad debe ser mayor a 0');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { activeSubscriptionTier: true }
    });

    let userSubscriptionDiscount = 0;
    let userSubscriptionTierName = 'Suscriptor';

    if (user?.activeSubscriptionTier) {
      const plan = await this.prisma.subscriptionPlan.findUnique({
        where: { tier: user.activeSubscriptionTier },
        select: { storeDiscountPercentage: true }
      });
      userSubscriptionDiscount = plan?.storeDiscountPercentage || 0;

      userSubscriptionTierName = user.activeSubscriptionTier.replace('_', ' ');
    }

    const { purchase, updatedBalance } = await this.prisma.$transaction(
      async (tx) => {
        const item = await tx.storeItem.findUnique({ where: { id: itemId } });

        if (!item || !item.isActive) {
          throw new NotFoundException('El ítem no está disponible');
        }

        if (!item.isPurchasable) {
          throw new BadRequestException('Este ítem es exclusivo y no se puede comprar en la tienda');
        }

        const existingInventory = await tx.userInventory.findUnique({
          where: { userId_itemId: { userId, itemId } },
        })

        if (
          existingInventory &&
          (item.type === 'STICKER_PACK' ||
            item.type === 'NAME_COLOR' ||
            item.type === 'BANNER' ||
            item.type === 'CHAT_BUBBLE')
        ) {
          throw new BadRequestException(
            'Ya sos dueño de este beneficio permanente',
          )
        }

        const finalQuantity = ['MEGAPHONE', 'CUSTOM_POLL'].includes(item.type) ? quantity : 1;

        const discountInfo = await this.getApplicableDiscount(
          item,
          userSubscriptionDiscount,
          userSubscriptionTierName,
          tx
        );

        const totalCost = discountInfo.currentPrice * finalQuantity;

        const updatedWallet = await this.walletService.subtractCoins(
          {
            userId,
            amount: totalCost,
            type: 'STORE_PURCHASE',
            description: `Compra en tienda: ${finalQuantity}x ${item.name} ${discountInfo.isDiscounted ? `(Desc: ${discountInfo.discountName})` : ''}`,
          },
          tx,
        )

        let resultInventory
        if (existingInventory) {
          resultInventory = await tx.userInventory.update({
            where: { id: existingInventory.id },
            data: { quantity: { increment: finalQuantity } },
          })
        } else {
          resultInventory = await tx.userInventory.create({
            data: { userId, itemId, quantity: finalQuantity },
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


  async getStoreItems(userId?: string): Promise<StoreItemResponseDto[]> {
    let userSubscriptionDiscount = 0;
    let userSubscriptionTierName = 'Suscriptor';

    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { activeSubscriptionTier: true }
      });

      if (user?.activeSubscriptionTier) {
        const plan = await this.prisma.subscriptionPlan.findUnique({
          where: { tier: user.activeSubscriptionTier },
          select: { storeDiscountPercentage: true }
        });
        userSubscriptionDiscount = plan?.storeDiscountPercentage || 0;
        userSubscriptionTierName = user.activeSubscriptionTier.replace('_', ' ');
      }
    }

    const items = await this.prisma.storeItem.findMany({
      where: {
        isActive: true,
        isPurchasable: true
      },
      include: {
        inventories: {
          where: { userId: userId || 'NO_USER' },
        },
      },
    });

    return Promise.all(
      items.map(async (item) => {
        const userInv = item.inventories[0]

        const discountInfo = await this.getApplicableDiscount(
          item,
          userSubscriptionDiscount,
          userSubscriptionTierName
        );

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
          isActive: item.isActive,
          isPurchasable: item.isPurchasable
        }
      }),
    )
  }

  async createStoreItem(dto: CreateStoreItemDto) {

    const existingItem = await this.prisma.storeItem.findUnique({
      where: { assetId: dto.assetId },
    });

    if (existingItem) {
      throw new ConflictException(
        `Ya existe un artículo en la tienda con el assetId: ${dto.assetId}`,
      );
    }

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

  async createStoreItemsBulk(dtos: CreateStoreItemDto[]) {
    const assetsToUpdate = [
      'maradona-mundial-beso-copa',
      'messi-pensativo-poster',
      'color_diamond',
      'color_gold',
      'color_silver',
      'bubble_mythic',
      'bubble_epic',
      'banner_toxic',
      'hola-susana',
      'drogba-barcelona-robo',
      'coco-basile-los-genios-hacen-eso'
    ];

    await this.prisma.storeItem.updateMany({
      where: {
        assetId: {
          in: assetsToUpdate
        }
      },
      data: {
        isPurchasable: false
      }
    });

    const processedItems: StoreItem[] = [];
    const errors: string[] = [];

    for (const dto of dtos) {
      try {
        const upsertedItem = await this.prisma.storeItem.upsert({
          where: {
            assetId: dto.assetId
          },
          update: {
            name: dto.name,
            description: dto.description,
            price: dto.price,
            type: dto.type,
            isActive: dto.isActive,
            isPurchasable: dto.isPurchasable
          },
          create: {
            assetId: dto.assetId,
            name: dto.name,
            description: dto.description,
            price: dto.price,
            type: dto.type,
            isActive: dto.isActive,
            isPurchasable: dto.isPurchasable
          },
        });

        processedItems.push(upsertedItem);
      } catch (error) {
        errors.push(`Falló el assetId ${dto.assetId}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    }

    return {
      processed: processedItems,
      errors
    };
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
