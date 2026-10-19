import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { PricingService } from './pricing.service'
import { GetUser } from '../auth/decorators/get-user.decorator'
import { Roles } from '../auth/decorators/roles.decorator'
import { RolesGuard } from '../auth/guards/roles.guard'
import { SystemRole } from '../auth/enums/roles.enum'
import { UpdateCoinPackPriceDto } from './dto/update-coin-pack-price.dto'
import { UpdateStoreItemPriceDto } from './dto/update-store-item-price.dto'
import { UpdateSubscriptionPlanPriceDto } from './dto/update-subscription-plan-price.dto'

@ApiTags('Pricing (Precios — solo PRESIDENT)')
@ApiBearerAuth()
@Controller('pricing')
// A nivel clase, así toda ruta nueva del módulo nace restringida al presidente.
@UseGuards(RolesGuard)
@Roles(SystemRole.PRESIDENT)
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @ApiOperation({
    summary: 'Precios vigentes de packs, tienda y planes (solo PRESIDENT)',
    description:
      'Devuelve en una sola llamada los packs de monedas, los ítems de la tienda, los planes de suscripción, los descuentos de tienda vigentes, los últimos 50 cambios de precio y el valor de referencia de la moneda en pesos.',
  })
  @ApiResponse({ status: 200, description: 'Precios vigentes.' })
  @ApiResponse({
    status: 403,
    description: 'El usuario no es presidente.',
  })
  @Get('admin')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getPricingOverview() {
    const data = await this.pricingService.getPricingOverview()

    return {
      status: 'success',
      message: 'Precios vigentes',
      data,
    }
  }

  @ApiOperation({
    summary: 'Cambiar el precio de un pack de monedas (solo PRESIDENT)',
    description:
      'Cambia únicamente `priceARS` y registra el cambio en la auditoría. No afecta las órdenes ya generadas: la preferencia de Mercado Pago conserva el precio con el que se creó.',
  })
  @ApiParam({ name: 'id', description: 'ID del pack' })
  @ApiResponse({ status: 200, description: 'Precio actualizado.' })
  @ApiResponse({ status: 403, description: 'El usuario no es presidente.' })
  @ApiResponse({ status: 404, description: 'El pack no existe.' })
  @ApiResponse({
    status: 409,
    description: 'Otro cambio de precio se aplicó primero.',
  })
  @Patch('coin-packs/:id')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async updateCoinPackPrice(
    @GetUser('id') actorId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCoinPackPriceDto,
  ) {
    const { entity, change, changed } =
      await this.pricingService.updateCoinPackPrice(actorId, id, dto.priceARS)

    return {
      status: 'success',
      message: changed
        ? 'Precio del pack de monedas actualizado'
        : 'El pack ya tenía ese precio: no se registró ningún cambio',
      data: { coinPack: entity, change },
    }
  }

  @ApiOperation({
    summary:
      'Cambiar el precio en monedas de un ítem de la tienda (solo PRESIDENT)',
    description:
      'Cambia únicamente `price` y registra el cambio en la auditoría. Los descuentos vigentes se recalculan sobre el precio nuevo en la siguiente consulta del catálogo.',
  })
  @ApiParam({ name: 'id', description: 'ID del ítem' })
  @ApiResponse({ status: 200, description: 'Precio actualizado.' })
  @ApiResponse({ status: 403, description: 'El usuario no es presidente.' })
  @ApiResponse({ status: 404, description: 'El ítem no existe.' })
  @ApiResponse({
    status: 409,
    description: 'Otro cambio de precio se aplicó primero.',
  })
  @Patch('store-items/:id')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async updateStoreItemPrice(
    @GetUser('id') actorId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStoreItemPriceDto,
  ) {
    const { entity, change, changed } =
      await this.pricingService.updateStoreItemPrice(actorId, id, dto.price)

    return {
      status: 'success',
      message: changed
        ? 'Precio del ítem de la tienda actualizado'
        : 'El ítem ya tenía ese precio: no se registró ningún cambio',
      data: { storeItem: entity, change },
    }
  }

  @ApiOperation({
    summary:
      'Cambiar el precio base de un plan de suscripción (solo PRESIDENT)',
    description:
      'Cambia únicamente `basePriceARS` y registra el cambio en la auditoría. Las suscripciones ya autorizadas siguen renovándose al precio con el que se creó su preapproval en Mercado Pago: el cambio aplica a altas y upgrades nuevos.',
  })
  @ApiParam({ name: 'id', description: 'ID del plan' })
  @ApiResponse({ status: 200, description: 'Precio actualizado.' })
  @ApiResponse({ status: 403, description: 'El usuario no es presidente.' })
  @ApiResponse({ status: 404, description: 'El plan no existe.' })
  @ApiResponse({
    status: 409,
    description: 'Otro cambio de precio se aplicó primero.',
  })
  @Patch('subscription-plans/:id')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async updateSubscriptionPlanPrice(
    @GetUser('id') actorId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubscriptionPlanPriceDto,
  ) {
    const { entity, change, changed } =
      await this.pricingService.updateSubscriptionPlanPrice(
        actorId,
        id,
        dto.basePriceARS,
      )

    return {
      status: 'success',
      message: changed
        ? 'Precio base del plan actualizado'
        : 'El plan ya tenía ese precio: no se registró ningún cambio',
      data: { subscriptionPlan: entity, change },
    }
  }
}
