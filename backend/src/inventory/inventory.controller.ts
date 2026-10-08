import { Controller, Get, Post, Param } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { InventoryService } from './inventory.service'
import { GetUser } from 'src/auth/decorators/get-user.decorator'

@ApiTags('Inventory (Inventario de cosméticos)')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @ApiOperation({
    summary: 'Inventario de ítems comprados del usuario logueado',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de ítems en inventario, con estado de equipado.',
  })
  @Get()
  async getMyInventory(@GetUser('id') userId: string) {
    return this.inventoryService.getUserInventory(userId)
  }

  @ApiOperation({ summary: 'Equipar un ítem cosmético del inventario' })
  @ApiParam({
    name: 'itemId',
    description: 'ID del ítem (de InventoryItem) a equipar',
  })
  @ApiResponse({ status: 201, description: 'Ítem equipado.' })
  @ApiResponse({
    status: 404,
    description: 'El ítem no está en el inventario del usuario.',
  })
  @Post('equip/:itemId')
  async equipItem(
    @Param('itemId') itemId: string,
    @GetUser('id') userId: string,
  ) {
    return this.inventoryService.equipItem(userId, itemId)
  }

  @ApiOperation({ summary: 'Quitar el cosmético equipado de un slot' })
  @ApiParam({
    name: 'type',
    enum: ['NAME_COLOR', 'BANNER', 'CHAT_BUBBLE'],
    description: 'Slot cosmético a desequipar',
  })
  @ApiResponse({ status: 201, description: 'Slot desequipado.' })
  @Post('unequip/:type')
  async unequipItem(
    @Param('type') type: 'NAME_COLOR' | 'BANNER' | 'CHAT_BUBBLE',
    @GetUser('id') userId: string,
  ) {
    return this.inventoryService.unequipItem(userId, type)
  }

  @ApiOperation({
    summary: 'Consumir un ítem consumible del inventario',
    description:
      'Actualmente solo soporta MEGAPHONE. Descuenta una unidad del stock del inventario.',
  })
  @ApiParam({
    name: 'type',
    enum: ['MEGAPHONE'],
    description: 'Tipo de consumible',
  })
  @ApiResponse({ status: 201, description: 'Ítem consumido.' })
  @ApiResponse({
    status: 400,
    description: 'El usuario no tiene unidades disponibles de ese consumible.',
  })
  @Post('consume/:type')
  async consumeItem(
    @Param('type') type: 'MEGAPHONE',
    @GetUser('id') userId: string,
  ) {
    return this.inventoryService.consumeItem(userId, type)
  }
}
