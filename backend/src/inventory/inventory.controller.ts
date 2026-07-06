// src/inventory/inventory.controller.ts
import { Controller, Get, Post, Param, } from '@nestjs/common'
import { InventoryService } from './inventory.service'
import { GetUser } from 'src/auth/decorators/get-user.decorator'

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) { }

  @Get()
  async getMyInventory(@GetUser('id') userId: string) {
    return this.inventoryService.getUserInventory(userId)
  }

  @Post('equip/:itemId')
  async equipItem(
    @Param('itemId') itemId: string,
    @GetUser('id') userId: string,
  ) {
    return this.inventoryService.equipItem(userId, itemId)
  }

  @Post('unequip/:type')
  async unequipItem(
    @Param('type') type: 'NAME_COLOR' | 'BANNER',
    @GetUser('id') userId: string,
  ) {
    return this.inventoryService.unequipItem(userId, type)
  }

  @Post('consume/:type')
  async consumeItem(
    @Param('type') type: 'MEGAPHONE',
    @GetUser('id') userId: string,
  ) {
    return this.inventoryService.consumeItem(userId, type)
  }
}
