import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common'
import { SubscriptionsService } from './subscriptions.service'
import { CheckoutSubscriptionDto } from './dto/checkout-subscription.dto'
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto'
import { UpgradeSubscriptionDto } from './dto/upgrade-subscription.dto'
import {
  CheckoutSubscriptionResponseDto,
  SubscriptionDetailResponseDto,
  UpgradeSubscriptionResponseDto,
} from './dto/subscription-response.dto'
import { GetUser } from 'src/auth/decorators/get-user.decorator'
import { SubscriptionTier } from '@prisma/client'
import { UpdatePlanPriceDto } from './dto/update-plan-price.dto'
import { OptionalAuth } from 'src/auth/decorators/auth.decorator'
import { SubscriptionCheckoutService } from './subscription-checkout.service'
import { SubscriptionPricingService } from './domain/subscription-pricing.service'
import { RolesGuard } from 'src/auth/guards/roles.guard'
import { Roles } from 'src/auth/decorators/roles.decorator'
import { SystemRole } from '@prisma/client'
/**
 * SubscriptionsController
 * Maneja todos los endpoints relacionados con suscripciones recurrentes
 * integradas con Mercado Pago
 */
@Controller('subscriptions')
export class SubscriptionsController {
  private readonly logger = new Logger(SubscriptionsController.name)

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly subscriptionCheckoutService: SubscriptionCheckoutService,
    private readonly subscriptionPricingService: SubscriptionPricingService,
  ) { }

  /**
   * Grilla informativa de planes con precios dinámicos actuales
   */
  @Get('plans')
  @OptionalAuth()
  @HttpCode(HttpStatus.OK)
  async getPlans(
    @GetUser('activeSubscriptionTier') userTier: SubscriptionTier | null,
  ) {
    return await this.subscriptionPricingService.getPlans(userTier)
  }

  /**
   * Obtiene los detalles de la suscripción actual del usuario autenticado
   */
  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getCurrentSubscription(
    @GetUser('id') userId: string,
  ): Promise<SubscriptionDetailResponseDto | null> {
    if (!userId) {
      throw new BadRequestException('Usuario no autenticado correctamente')
    }

    return await this.subscriptionsService.getCurrentSubscription(userId)
  }

  /**

 * Inicia el proceso de compra de una suscripción
 * El usuario selecciona el tier deseado y recibe un link de Mercado Pago
 */
  @Post('checkout')
  @HttpCode(HttpStatus.OK)
  async checkout(
    @Body() dto: CheckoutSubscriptionDto,
    @GetUser('id') userId: string,
  ): Promise<CheckoutSubscriptionResponseDto> {
    if (!userId) {
      throw new BadRequestException('Usuario no autenticado correctamente')
    }

    this.logger.log(
      `[POST /checkout] Iniciando checkout para user ${userId}, tier ${dto.tier}`,
    )

    return await this.subscriptionCheckoutService.startCheckout(
      userId,
      dto.tier,
    )
  }

  /**

 * Cancela la suscripción ACTIVE del usuario (Estilo Spotify)
 * Los beneficios se mantienen activos hasta el fin del ciclo
 */
  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Body() dto: CancelSubscriptionDto,
    @GetUser('id') userId: string,
  ) {
    if (!userId) {
      throw new BadRequestException('Usuario no autenticado correctamente')
    }

    this.logger.log(`[POST /cancel] Cancelando suscripción de user ${userId}`)

    return await this.subscriptionCheckoutService.cancelSubscription(
      userId,
      dto.reason,
    )
  }

  /**
   * Upgradea la suscripción a un tier superior
   * Genera bonus coins por los días restantes del plan viejo
   */
  @Post('upgrade')
  @HttpCode(HttpStatus.OK)
  async upgrade(
    @Body() dto: UpgradeSubscriptionDto,
    @GetUser('id') userId: string,
  ): Promise<UpgradeSubscriptionResponseDto> {
    if (!userId) {
      throw new BadRequestException('Usuario no autenticado correctamente')
    }

    this.logger.log(
      `[POST /upgrade] Upgrade para user ${userId} a tier ${dto.newTier}`,
    )

    return await this.subscriptionCheckoutService.upgradeSubscription(
      userId,
      dto.newTier,
    )
  }

  @Patch('plans/price')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async updatePlanPrice(@Body() dto: UpdatePlanPriceDto) {
    this.logger.log(
      `[PATCH /plans/price] Solicitud de cambio de precio para ${dto.tier}`,
    )
    return await this.subscriptionsService.updatePlanPrice(
      dto.tier,
      dto.basePriceARS,
    )
  }

  @Delete('admin/reset/:userId')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN)
  async deleteUserSubscriptions(@Param('userId') userId: string) {
    return await this.subscriptionsService.deleteUserSubscriptions(userId)
  }
}
