import {
  Controller,
  Post,
  Param,
  UseGuards,
  Get,
  Body,
  Patch,
  Delete,
} from '@nestjs/common'
import { StoreService } from './store.service'
import { GetUser } from 'src/auth/decorators/get-user.decorator'
import { CreateStoreItemDto } from './dto/create-store-item.dto'
import { CreateStoreDiscountDto } from './dto/create-store-discount.dto'
import { UpdateStoreItemDto } from './dto/update-store-item.dto'
import { OptionalAuth } from 'src/auth/decorators/auth.decorator'

@Controller('store')
export class StoreController {
  constructor(private readonly storeService: StoreService) { }

  @Get()
  @OptionalAuth()
  async getStore(@GetUser('id') userId: string) {
    return this.storeService.getStoreItems(userId)
  }

  @Post('buy/:itemId')
  async buyItem(
    @Param('itemId') itemId: string,
    @GetUser('id') userId: string,
  ) {
    const purchase = await this.storeService.buyItem(userId, itemId)

    return {
      status: 'success',
      message: '¡Artículo adquirido correctamente!',
      data: purchase,
    }
  }

  @Post('item') // TODO: Meter roles de Admin a futuro
  async createStoreItem(@Body() dto: CreateStoreItemDto) {
    const item = await this.storeService.createStoreItem(dto)
    return {
      status: 'success',
      message: 'Artículo creado en la tienda.',
      data: item,
    }
  }

  @Patch('item/:id')
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

  @Delete('item/:id')
  async deleteStoreItem(@Param('id') id: string) {
    await this.storeService.deleteStoreItem(id)
    return {
      status: 'success',
      message: 'Artículo removido de la tienda con éxito (Soft Delete).',
    }
  }

  @Post('discount')
  async createDiscount(@Body() dto: CreateStoreDiscountDto) {
    const discount = await this.storeService.createDiscount(dto)
    return {
      status: 'success',
      message: 'Campaña de descuento creada y agendada con éxito.',
      data: discount,
    }
  }
}
