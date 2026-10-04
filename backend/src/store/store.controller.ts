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
import { StoreService } from './store.service'
import { GetUser } from 'src/auth/decorators/get-user.decorator'
import { CreateStoreItemDto } from './dto/create-store-item.dto'
import { CreateStoreDiscountDto } from './dto/create-store-discount.dto'
import { UpdateStoreItemDto } from './dto/update-store-item.dto'
import { OptionalAuth } from 'src/auth/decorators/auth.decorator'
import { Roles } from 'src/auth/decorators/roles.decorator'
import { SystemRole } from 'src/auth/enums/roles.enum'

@Controller('store')
export class StoreController {
  constructor(private readonly storeService: StoreService) { }

  @Get()
  @OptionalAuth()
  async getStore(@GetUser('id') userId: string) {
    return this.storeService.getStoreItems(userId)
  }

  @Get('all-items')
  @OptionalAuth()
  async getStoreItemsAll() {
    return this.storeService.getStoreItemsAll()
  }

  @Post('buy/:itemId')
  async buyItem(
    @Param('itemId') itemId: string,
    @Body('quantity') quantity: number,
    @GetUser('id') userId: string,
  ) {
    const purchase = await this.storeService.buyItem(userId, itemId, quantity)

    return {
      status: 'success',
      message: '¡Artículo adquirido correctamente!',
      data: purchase,
    }
  }

  @Post('item')
  @Roles(SystemRole.ADMIN)
  async createStoreItem(@Body() dto: CreateStoreItemDto) {
    const item = await this.storeService.createStoreItem(dto)
    return {
      status: 'success',
      message: 'Artículo creado en la tienda.',
      data: item,
    }
  }

  @Post('item/bulk')
  @Roles(SystemRole.ADMIN)
  async createStoreItemsBulk(
    @Body(new ParseArrayPipe({ items: CreateStoreItemDto })) dtos: CreateStoreItemDto[]
  ) {
    const result = await this.storeService.createStoreItemsBulk(dtos);
    return {
      status: 'success',
      message: 'Proceso masivo finalizado.',
      data: result,
    };
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
