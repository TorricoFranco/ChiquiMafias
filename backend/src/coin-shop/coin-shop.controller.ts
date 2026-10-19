import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { CoinShopService } from './coin-shop.service'
import { GetUser } from '../auth/decorators/get-user.decorator'
import { OptionalAuth } from '../auth/decorators/auth.decorator'
import { Roles } from '../auth/decorators/roles.decorator'
import { PriceFields } from '../auth/decorators/price-fields.decorator'
import { RolesGuard } from '../auth/guards/roles.guard'
import { PriceFieldsGuard } from '../auth/guards/price-fields.guard'
import { SystemRole } from '../auth/enums/roles.enum'
import { CreatePackDto } from './dto/create-pack.dto'
import { UpdatePackDto } from './dto/update-pack.dto'
import { BuyPackDto } from './dto/buy-pack.dto'

@ApiTags('Coin Shop (Compra de monedas con dinero real)')
@Controller('coin-shop')
export class CoinShopController {
  constructor(private readonly coinShopService: CoinShopService) {}

  @ApiOperation({ summary: 'Catálogo público de packs de monedas activos' })
  @ApiResponse({ status: 200, description: 'Lista de packs activos.' })
  @Get('packs')
  @OptionalAuth()
  async getActivePacks() {
    return this.coinShopService.getActivePacks()
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Comprar un pack de monedas con dinero real',
    description:
      'Genera una preferencia de pago de Mercado Pago para el pack elegido. El acreditado de monedas ocurre de forma idempotente cuando llega el webhook de pago aprobado, no en esta llamada.',
  })
  @ApiResponse({ status: 201, description: 'Preferencia de pago generada.' })
  @ApiResponse({
    status: 404,
    description: 'El pack no existe o no está activo.',
  })
  @Post('buy')
  async buyPack(@GetUser('id') userId: string, @Body() dto: BuyPackDto) {
    const result = await this.coinShopService.buyPack(userId, dto.packId)
    return {
      status: 'success',
      message: 'Preferencia de pago generada correctamente',
      data: result,
    }
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Historial de órdenes de compra del usuario logueado',
  })
  @ApiResponse({ status: 200, description: 'Lista de órdenes del usuario.' })
  @Get('my-orders')
  async getMyOrders(@GetUser('id') userId: string) {
    return this.coinShopService.getUserOrders(userId)
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar todos los packs, incluidos los inactivos (solo ADMIN)',
  })
  @ApiResponse({ status: 200, description: 'Lista completa de packs.' })
  @Get('admin/packs')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN)
  async getAllPacksAdmin() {
    return this.coinShopService.getAllPacksAdmin()
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Crear un pack de monedas (solo PRESIDENT)',
    description:
      'Fija el precio en pesos del pack, así que es exclusivo del presidente. El resto de los campos de un pack existente los sigue editando un ADMIN.',
  })
  @ApiResponse({ status: 201, description: 'Pack creado.' })
  @ApiResponse({
    status: 403,
    description: 'Solo el presidente puede definir precios.',
  })
  @Post('admin/packs')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.PRESIDENT)
  async createPack(@Body() dto: CreatePackDto) {
    const pack = await this.coinShopService.createPack(dto)
    return {
      status: 'success',
      message: 'Pack de monedas creado con éxito',
      data: pack,
    }
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Actualizar un pack de monedas (solo ADMIN, sin el precio)',
    description:
      'El precio (`priceARS`) **no se cambia acá con ningún rol**: su única vía es `PATCH /pricing/coin-packs/:id`, que registra el cambio en la auditoría. `coinsAmount` y `bonusCoins` solo los puede mandar el PRESIDENT, porque definen cuántas monedas se entregan por peso. Cualquier otro caso devuelve 403.',
  })
  @ApiParam({ name: 'id', description: 'ID del pack a actualizar' })
  @ApiResponse({ status: 200, description: 'Pack actualizado.' })
  @ApiResponse({
    status: 403,
    description: 'Solo el presidente puede cambiar el precio.',
  })
  @ApiResponse({ status: 404, description: 'El pack no existe.' })
  @Patch('admin/packs/:id')
  @UseGuards(RolesGuard, PriceFieldsGuard)
  @Roles(SystemRole.ADMIN)
  // `coinsAmount` y `bonusCoins` son el precio de la moneda en pesos: subirlos
  // equivale a bajar el precio, y `updatePack` escribe el DTO completo.
  @PriceFields({
    blocked: ['priceARS'],
    presidentOnly: ['coinsAmount', 'bonusCoins'],
  })
  async updatePack(@Param('id') id: string, @Body() dto: UpdatePackDto) {
    const pack = await this.coinShopService.updatePack(id, dto)
    return {
      status: 'success',
      message: 'Pack de monedas actualizado',
      data: pack,
    }
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar un pack de monedas (solo ADMIN)' })
  @ApiParam({ name: 'id', description: 'ID del pack a eliminar' })
  @ApiResponse({ status: 200, description: 'Pack eliminado.' })
  @ApiResponse({ status: 404, description: 'El pack no existe.' })
  @Delete('admin/packs/:id')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN)
  async deletePack(@Param('id') id: string) {
    await this.coinShopService.deletePack(id)
    return {
      status: 'success',
      message: 'Pack de monedas eliminado',
    }
  }
}
