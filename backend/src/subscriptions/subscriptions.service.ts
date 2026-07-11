import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { SubscriptionTier, SubscriptionStatus } from '@prisma/client'
import { MercadoPagoService } from 'src/mercado-pago/mercado-pago.service'
import { SubscriptionPricingService } from './domain/subscription-pricing.service'

import { SubscriptionDetailResponseDto } from './dto/subscription-response.dto'

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(MercadoPagoService.name)

  constructor(
    private readonly pricingService: SubscriptionPricingService,
    private readonly prisma: PrismaService,
  ) { }


  /**
   * ============================================================================
   * ACTUALIZAR PRECIO BASE DE UN PLAN (ADMIN ONLY)
   * ============================================================================
   */
  async updatePlanPrice(tier: SubscriptionTier, basePriceARS: number) {
    try {
      // Verificamos si el plan existe antes de actualizar
      const plan = await this.prisma.subscriptionPlan.findUnique({
        where: { tier },
      })

      if (!plan) {
        throw new BadRequestException(
          `No se encontró el plan para el tier ${tier}`,
        )
      }

      // Actualizamos el precio
      const updatedPlan = await this.prisma.subscriptionPlan.update({
        where: { tier },
        data: { basePriceARS },
      })

      this.logger.log(
        `[Admin] Precio del plan ${tier} actualizado a $${basePriceARS} ARS`,
      )

      return {
        message: `Precio del plan ${tier} actualizado con éxito.`,
        plan: updatedPlan,
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error

      this.logger.error(`[UpdatePlanPrice Error] ${error.message}`, error.stack)
      throw new InternalServerErrorException(
        'Error al actualizar el precio del plan',
      )
    }
  }

  // -----------------------------
  /**
   * ============================================================================
   * OBTENER DETALLES DE SUSCRIPCIÓN ACTUAL
   * ============================================================================
   */
  async getCurrentSubscription(
    userId: string,
  ): Promise<SubscriptionDetailResponseDto> {
    // 1. Buscamos el usuario para saber su tier real e impactado actualmente
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { activeSubscriptionTier: true },
    })

    // 2. Buscamos primero si tiene algo corriendo (ACTIVE o CANCELLATION_PENDING)
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

