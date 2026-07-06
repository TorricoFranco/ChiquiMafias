import {
  Controller,
  Post,
  Get,
  Body,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  Patch,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { SubscriptionsService } from './subscriptions.service'
import { CheckoutSubscriptionDto } from './dto/checkout-subscription.dto'
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto'
import { UpgradeSubscriptionDto } from './dto/upgrade-subscription.dto'
import { MercadoPagoWebhookDto } from './dto/mercado-pago-webhook.dto'
import {
  CheckoutSubscriptionResponseDto,
  SubscriptionDetailResponseDto,
  UpgradeSubscriptionResponseDto,
} from './dto/subscription-response.dto'
import { GetUser } from 'src/auth/decorators/get-user.decorator'
import { SubscriptionTier } from '@prisma/client'
import { UpdatePlanPriceDto } from './dto/update-plan-price.dto'
import { OptionalAuth, Public } from 'src/auth/decorators/auth.decorator'

/**
 * SubscriptionsController
 * Maneja todos los endpoints relacionados con suscripciones recurrentes
 * integradas con Mercado Pago
 */
@Controller('subscriptions')
export class SubscriptionsController {
  private readonly logger = new Logger(SubscriptionsController.name)

  constructor(private readonly subscriptionsService: SubscriptionsService) { }

  /**
   * Grilla informativa de planes con precios dinámicos actuales
   */
  @Get('plans')
  @OptionalAuth()
  @HttpCode(HttpStatus.OK)
  async getPlans(
    @GetUser('activeSubscriptionTier') userTier: SubscriptionTier | null,
  ) {
    return await this.subscriptionsService.getPlans(userTier)
  }

  /**
   * Obtiene los detalles de la suscripción actual del usuario autenticado
   */
  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getCurrentSubscription(
    @Request() req,
  ): Promise<SubscriptionDetailResponseDto | null> {
    const userId = req.user?.sub || req.user?.id

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
    @Request() req,
  ): Promise<CheckoutSubscriptionResponseDto> {
    const userId = req.user?.sub || req.user?.id

    if (!userId) {
      throw new BadRequestException('Usuario no autenticado correctamente')
    }

    this.logger.log(
      `[POST /checkout] Iniciando checkout para user ${userId}, tier ${dto.tier}`,
    )

    return await this.subscriptionsService.startCheckout(userId, dto.tier)
  }

  /**
   * Endpoint público que recibe notificaciones de Mercado Pago
   * Procesa pagos exitosos y actualiza el estado de suscripcione
   */
  // TODO FIJARSE QUE ESTE BIEN FILTRADO Y NO CUALQUIERA PUEDA PEGARLE Y SIMULAR UN PAYLOAD
  @Post('webhook')
  @Public()
  // Alivianamos el cañón de class-validator para que no rebote campos extras de MP
  @UsePipes(
    new ValidationPipe({
      whitelist: false,
      forbidNonWhitelisted: false,
    }),
  )
  async handleWebhook(@Body() payload: any) {
    // Podés dejarle el tipo o usar el DTO actualizado
    return this.subscriptionsService.processWebhook(payload)
  }
  /**

   * Cancela la suscripción ACTIVE del usuario (Estilo Spotify)
   * Los beneficios se mantienen activos hasta el fin del ciclo
   */
  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(@Body() dto: CancelSubscriptionDto, @Request() req) {
    const userId = req.user?.sub || req.user?.id

    if (!userId) {
      throw new BadRequestException('Usuario no autenticado correctamente')
    }

    this.logger.log(`[POST /cancel] Cancelando suscripción de user ${userId}`)

    return await this.subscriptionsService.cancelSubscription(
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
    @Request() req,
  ): Promise<UpgradeSubscriptionResponseDto> {
    const userId = req.user?.sub || req.user?.id

    if (!userId) {
      throw new BadRequestException('Usuario no autenticado correctamente')
    }

    this.logger.log(
      `[POST /upgrade] Upgrade para user ${userId} a tier ${dto.newTier}`,
    )

    return await this.subscriptionsService.upgradeSubscription(
      userId,
      dto.newTier,
    )
  }

  @Patch('plans/price')
  @OptionalAuth()
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
}
