import {
  Controller,
  Post,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { WalletService } from './wallet.service'
import { AdminAddCoinsDto } from './dto/admin-add-coins.dto'
import { SystemRole } from 'src/auth/enums/roles.enum'
import { Roles } from 'src/auth/decorators/roles.decorator'
import { RolesGuard } from 'src/auth/guards/roles.guard'

import { Wallet, TransactionType } from '@prisma/client'
import { GetUser } from 'src/auth/decorators/get-user.decorator'

@ApiTags('Wallet (Monedas)')
@ApiBearerAuth()
@Controller('wallet')
@UseGuards(RolesGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @ApiOperation({
    summary: 'Saldo de monedas del usuario logueado',
  })
  @ApiResponse({ status: 200, description: 'Saldo actual del usuario.' })
  @Post('my-balance')
  async getMyBalance(@GetUser('id') userId: string): Promise<number> {
    if (!userId) {
      throw new BadRequestException(
        'No se pudo identificar al usuario desde el token.',
      )
    }

    return this.walletService.getBalance(userId)
  }

  @ApiOperation({
    summary: 'Acreditar monedas a un usuario (solo PRESIDENT)',
    description:
      'Acredita monedas a cualquier usuario como regalo administrativo (TransactionType.ADMIN_GIFT). Si el saldo resultante superaría el tope MAX_COIN_BALANCE (50000), se recorta en silencio a ese tope (no lanza error) y solo se registra la diferencia realmente acreditada.',
  })
  @ApiResponse({
    status: 201,
    description: 'Wallet actualizada con el nuevo saldo (recortado al tope si corresponde).',
  })
  @ApiResponse({
    status: 400,
    description: 'El monto a acreditar es menor o igual a cero.',
  })
  @Post('admin/add-coins')
  @Roles(SystemRole.PRESIDENT)
  async adminAddCoins(@Body() dto: AdminAddCoinsDto): Promise<Wallet> {
    return this.walletService.addCoins({
      userId: dto.userId,
      amount: dto.amount,
      description: dto.description,
      type: TransactionType.ADMIN_GIFT,
    })
  }
}
