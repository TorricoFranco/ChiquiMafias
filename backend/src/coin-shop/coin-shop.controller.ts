import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common'
import { CoinShopService } from './coin-shop.service'
import { GetUser } from '../auth/decorators/get-user.decorator'
import { OptionalAuth } from '../auth/decorators/auth.decorator'
import { Roles } from '../auth/decorators/roles.decorator'
import { SystemRole } from '../auth/enums/roles.enum'
import { CreatePackDto } from './dto/create-pack.dto'
import { UpdatePackDto } from './dto/update-pack.dto'
import { BuyPackDto } from './dto/buy-pack.dto'

@Controller('coin-shop')
export class CoinShopController {
  constructor(private readonly coinShopService: CoinShopService) {}

  // Public: Catálogo de packs activos
  @Get('packs')
  @OptionalAuth()
  async getActivePacks() {
    return this.coinShopService.getActivePacks()
  }

  // User: Comprar pack 
  @Post('buy')
  async buyPack(
    @GetUser('id') userId: string,
    @Body() dto: BuyPackDto,
  ) {
    const result = await this.coinShopService.buyPack(userId, dto.packId)
    return {
      status: 'success',
      message: 'Preferencia de pago generada correctamente',
      data: result,
    }
  }

  // User: Mis órdenes de compra
  @Get('my-orders')
  async getMyOrders(@GetUser('id') userId: string) {
    return this.coinShopService.getUserOrders(userId)
  }

  // Admin: Obtener todos los packs (incluyendo inactivos)
  @Get('admin/packs')
  @Roles(SystemRole.ADMIN)
  async getAllPacksAdmin() {
    return this.coinShopService.getAllPacksAdmin()
  }

  // Admin: Crear pack
  @Post('admin/packs')
  @Roles(SystemRole.ADMIN)
  async createPack(@Body() dto: CreatePackDto) {
    const pack = await this.coinShopService.createPack(dto)
    return {
      status: 'success',
      message: 'Pack de monedas creado con éxito',
      data: pack,
    }
  }

  // Admin: Actualizar pack
  @Patch('admin/packs/:id')
  @Roles(SystemRole.ADMIN)
  async updatePack(
    @Param('id') id: string,
    @Body() dto: UpdatePackDto,
  ) {
    const pack = await this.coinShopService.updatePack(id, dto)
    return {
      status: 'success',
      message: 'Pack de monedas actualizado',
      data: pack,
    }
  }

  // Admin: Eliminar pack
  @Delete('admin/packs/:id')
  @Roles(SystemRole.ADMIN)
  async deletePack(@Param('id') id: string) {
    await this.coinShopService.deletePack(id)
    return {
      status: 'success',
      message: 'Pack de monedas eliminado',
    }
  }
}
