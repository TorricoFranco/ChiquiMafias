import {
  Controller,
  Post,
  Param,
  UseGuards,
  Get,
  Body,
  Patch,
  Delete,
  ParseArrayPipe,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { StoreService } from './store.service'
import { GetUser } from 'src/auth/decorators/get-user.decorator'
import { CreateStoreItemDto } from './dto/create-store-item.dto'
import { CreateStoreDiscountDto } from './dto/create-store-discount.dto'
import { UpdateStoreItemDto } from './dto/update-store-item.dto'
import { BuyItemDto } from './dto/buy-item.dto'
import { OptionalAuth } from 'src/auth/decorators/auth.decorator'
import { Roles } from 'src/auth/decorators/roles.decorator'
import { PriceFields } from 'src/auth/decorators/price-fields.decorator'
import { RolesGuard } from 'src/auth/guards/roles.guard'
import { PriceFieldsGuard } from 'src/auth/guards/price-fields.guard'
import { SystemRole } from 'src/auth/enums/roles.enum'

@ApiTags('Store (Tienda de cosméticos)')
@Controller('store')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @ApiOperation({
    summary:
      'Catálogo de la tienda con descuentos vigentes y estado de compra del usuario',
  })
  @ApiResponse({ status: 200, description: 'Lista de ítems de la tienda.' })
  @Get()
  @OptionalAuth()
  async getStore(@GetUser('id') userId: string) {
    return this.storeService.getStoreItems(userId)
  }

  @ApiOperation({
    summary: 'Catálogo completo de ítems, incluidos los no comprables',
  })
  @ApiResponse({ status: 200, description: 'Lista completa de ítems.' })
  @Get('all-items')
  @OptionalAuth()
  async getStoreItemsAll() {
    return this.storeService.getStoreItemsAll()
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Comprar un ítem de la tienda con monedas',
    description:
      'Descuenta el precio (con descuento vigente aplicado, si corresponde) de la billetera del usuario y agrega el ítem a su inventario.',
  })
  @ApiParam({ name: 'itemId', description: 'ID del ítem a comprar' })
  @ApiResponse({ status: 201, description: 'Compra realizada.' })
  @ApiResponse({
    status: 400,
    description:
      'Cantidad inválida, ítem exclusivo no comprable, o saldo insuficiente.',
  })
  @ApiResponse({
    status: 404,
    description: 'El ítem no existe o no está disponible.',
  })
  @Post('buy/:itemId')
  async buyItem(
    @Param('itemId') itemId: string,
    @Body() dto: BuyItemDto,
    @GetUser('id') userId: string,
  ) {
    const purchase = await this.storeService.buyItem(
      userId,
      itemId,
      dto.quantity,
    )

    return {
      status: 'success',
      message: '¡Artículo adquirido correctamente!',
      data: purchase,
    }
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Crear un ítem de la tienda (solo PRESIDENT)',
    description:
      'Fija el precio en monedas del ítem, así que es exclusivo del presidente. El resto de los campos de un ítem existente los sigue editando un ADMIN.',
  })
  @ApiResponse({ status: 201, description: 'Ítem creado.' })
  @ApiResponse({
    status: 403,
    description: 'Solo el presidente puede definir precios.',
  })
  @ApiResponse({
    status: 409,
    description: 'Ya existe un ítem con ese assetId/tipo.',
  })
  @Post('item')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.PRESIDENT)
  async createStoreItem(@Body() dto: CreateStoreItemDto) {
    const item = await this.storeService.createStoreItem(dto)
    return {
      status: 'success',
      message: 'Artículo creado en la tienda.',
      data: item,
    }
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Crear varios ítems de la tienda en una sola llamada (solo PRESIDENT)',
    description:
      'Hace upsert, o sea que también reescribe el precio de los ítems que ya existen: es un cambio masivo de precios y por eso queda reservado al presidente.',
  })
  @ApiBody({ type: [CreateStoreItemDto] })
  @ApiResponse({ status: 201, description: 'Resultado del proceso masivo.' })
  @ApiResponse({
    status: 403,
    description: 'Solo el presidente puede definir precios.',
  })
  @Post('item/bulk')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.PRESIDENT)
  async createStoreItemsBulk(
    @Body(new ParseArrayPipe({ items: CreateStoreItemDto }))
    dtos: CreateStoreItemDto[],
  ) {
    const result = await this.storeService.createStoreItemsBulk(dtos)
    return {
      status: 'success',
      message: 'Proceso masivo finalizado.',
      data: result,
    }
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Actualizar un ítem de la tienda (solo ADMIN, sin el precio)',
    description:
      'El precio (`price`) **no se cambia acá con ningún rol**: su única vía es `PATCH /pricing/store-items/:id`, que registra el cambio en la auditoría. Mandarlo devuelve 403.',
  })
  @ApiParam({ name: 'id', description: 'ID del ítem a actualizar' })
  @ApiResponse({ status: 200, description: 'Ítem actualizado.' })
  @ApiResponse({
    status: 403,
    description: 'Solo el presidente puede cambiar el precio.',
  })
  @ApiResponse({ status: 404, description: 'El ítem no existe.' })
  @Patch('item/:id')
  @UseGuards(RolesGuard, PriceFieldsGuard)
  @Roles(SystemRole.ADMIN)
  @PriceFields({ blocked: ['price'] })
  async updateStoreItem(
    @Param('id') id: string,
    @Body() dto: UpdateStoreItemDto,
  ) {
    const updatedItem = await this.storeService.updateStoreItem(id, dto)
    return {
      status: 'success',
      message: 'Artículo actualizado correctamente.',
      data: updatedItem,
    }
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Eliminar (soft delete) un ítem de la tienda (solo ADMIN)',
  })
  @ApiParam({ name: 'id', description: 'ID del ítem a eliminar' })
  @ApiResponse({ status: 200, description: 'Ítem removido (soft delete).' })
  @ApiResponse({ status: 404, description: 'El ítem no existe.' })
  @Delete('item/:id')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN)
  async deleteStoreItem(@Param('id') id: string) {
    await this.storeService.deleteStoreItem(id)
    return {
      status: 'success',
      message: 'Artículo removido de la tienda con éxito (Soft Delete).',
    }
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Crear una campaña de descuento para la tienda (solo PRESIDENT)',
    description:
      'El descuento aplica entre `startDate` y `endDate` a todos los ítems, a un tipo (`BY_TYPE`) o a un ítem puntual (`SPECIFIC_ITEM`), según `scope`. Como baja el precio efectivo hasta un 90%, es un cambio de precio y queda reservado al presidente.',
  })
  @ApiResponse({ status: 201, description: 'Campaña de descuento creada.' })
  @ApiResponse({
    status: 403,
    description: 'Solo el presidente puede cambiar precios.',
  })
  @Post('discount')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.PRESIDENT)
  async createDiscount(@Body() dto: CreateStoreDiscountDto) {
    const discount = await this.storeService.createDiscount(dto)
    return {
      status: 'success',
      message: 'Campaña de descuento creada y agendada con éxito.',
      data: discount,
    }
  }
}
