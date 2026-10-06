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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
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
import { OptionalAuth } from 'src/auth/decorators/auth.decorator'
import { SubscriptionCheckoutService } from './subscription-checkout.service'
import { SubscriptionPricingService } from './domain/subscription-pricing.service'
import { RolesGuard } from 'src/auth/guards/roles.guard'
import { Roles } from 'src/auth/decorators/roles.decorator'
import { SystemRole } from '@prisma/client'
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto'
/**
 * SubscriptionsController
 * Maneja todos los endpoints relacionados con suscripciones recurrentes
 * integradas con Mercado Pago
 */
@ApiTags('Subscriptions (Suscripciones)')
@Controller('subscriptions')
export class SubscriptionsController {
  private readonly logger = new Logger(SubscriptionsController.name)

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly subscriptionCheckoutService: SubscriptionCheckoutService,
    private readonly subscriptionPricingService: SubscriptionPricingService,
  ) {}

  @ApiOperation({
    summary: 'Grilla de planes de suscripción con precios dinámicos',
    description:
      'Si el usuario está autenticado, devuelve los precios ajustados según su tier actual (ej. costo de upgrade).',
  })
  @ApiResponse({ status: 200, description: 'Lista de planes disponibles.' })
  @Get('plans')
  @OptionalAuth()
  @HttpCode(HttpStatus.OK)
  async getPlans(
    @GetUser('activeSubscriptionTier') userTier: SubscriptionTier | null,
  ) {
    return await this.subscriptionPricingService.getPlans(userTier)
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Actualizar la configuración de un plan de suscripción (solo ADMIN)',
  })
  @ApiParam({ name: 'id', description: 'ID del plan a actualizar' })
  @ApiResponse({ status: 200, description: 'Plan actualizado.' })
  @ApiResponse({ status: 404, description: 'El plan no existe.' })
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN)
  async updatePlan(
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionPlanDto,
  ) {
    const updatedPlan = await this.subscriptionsService.updatePlan(id, dto)

    return {
      status: 'success',
      message: 'Plan actualizado correctamente',
      data: updatedPlan,
    }
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Detalle de la suscripción actual del usuario logueado',
  })
  @ApiResponse({
    status: 200,
    type: SubscriptionDetailResponseDto,
    description: 'Suscripción actual, o null si no tiene.',
  })
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

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Iniciar el checkout de una suscripción',
    description:
      'Crea una suscripción en estado pendiente y devuelve el link de pago (preapproval) de Mercado Pago para el tier elegido. Los beneficios se activan al recibir el webhook de pago aprobado.',
  })
  @ApiResponse({
    status: 200,
    type: CheckoutSubscriptionResponseDto,
    description: 'Checkout iniciado.',
  })
  @ApiResponse({
    status: 400,
    description: 'Usuario no autenticado o tier inválido.',
  })
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

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cancelar la suscripción activa (estilo Spotify)',
    description:
      'Marca la suscripción para no renovarse; los beneficios se mantienen activos hasta el fin del ciclo ya pagado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Suscripción marcada para cancelación.',
  })
  @ApiResponse({
    status: 400,
    description: 'Usuario no autenticado o sin suscripción activa.',
  })
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

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Upgradear la suscripción a un tier superior',
    description:
      'Cambia la suscripción activa al tier indicado y acredita monedas de bonificación proporcionales a los días restantes del plan anterior.',
  })
  @ApiResponse({
    status: 200,
    type: UpgradeSubscriptionResponseDto,
    description: 'Upgrade realizado.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Usuario no autenticado o no tiene una suscripción activa para upgradear.',
  })
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

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Borrar todas las suscripciones de un usuario (solo ADMIN)',
    description:
      'Operación destructiva de soporte/testing: elimina el historial de suscripciones del usuario indicado.',
  })
  @ApiParam({
    name: 'userId',
    description: 'ID del usuario cuyas suscripciones se eliminan',
  })
  @ApiResponse({ status: 200, description: 'Suscripciones eliminadas.' })
  @Delete('admin/reset/:userId')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN)
  async deleteUserSubscriptions(@Param('userId') userId: string) {
    return await this.subscriptionsService.deleteUserSubscriptions(userId)
  }
}
