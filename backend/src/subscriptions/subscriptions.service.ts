import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { SubscriptionTier, SubscriptionStatus } from '@prisma/client'
import { MercadoPagoService } from 'src/mercado-pago/mercado-pago.service'
import { SubscriptionPricingService } from './domain/subscription-pricing.service'

import { SubscriptionDetailResponseDto } from './dto/subscription-response.dto'
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto'

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(MercadoPagoService.name)

  constructor(
    private readonly pricingService: SubscriptionPricingService,
    private readonly prisma: PrismaService,
  ) { }


  /**
 * ACTUALIZAR UN PLAN 
 */
  async updatePlan(id: string, dto: UpdateSubscriptionPlanDto) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException('El plan de suscripción no existe');
    }

    return this.prisma.subscriptionPlan.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * OBTENER DETALLES DE SUSCRIPCIÓN ACTUAL
   */
  async getCurrentSubscription(
    userId: string,
  ): Promise<SubscriptionDetailResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { activeSubscriptionTier: true },
    })

    let subscription = await this.prisma.userSubscription.findFirst({
      where: {
        userId,
        status: {
          in: [
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.CANCELLATION_PENDING,
          ],
        },
      },
    })

    if (!subscription) {
      subscription = await this.prisma.userSubscription.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      })
    }

    if (!subscription) {
      return {
        currentActualTier: user?.activeSubscriptionTier || null,
        id: null,
        tier: null,
        status: null,
        startsAt: null,
        endsAt: null,
        autoRenew: null,
      }
    }

    return {
      currentActualTier: user?.activeSubscriptionTier || null,
      id: subscription.id,
      tier: subscription.tier,
      status: subscription.status,
      startsAt: subscription.startsAt,
      endsAt: subscription.endsAt,
      autoRenew: subscription.autoRenew,
      mpPreapprovalId: subscription.mpPreapprovalId ?? undefined,
      mpExternalRef: subscription.mpExternalRef ?? undefined,
    }
  }

  // PRUEBAAAA
  async deleteUserSubscriptions(userId: string) {
    // Usamos una transacción para asegurar que borramos la sub
    // Y limpiamos el estado del usuario simultáneamente
    return await this.prisma.$transaction([
      this.prisma.userSubscription.deleteMany({
        where: { userId },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { activeSubscriptionTier: null },
      }),
    ])
  }
}
