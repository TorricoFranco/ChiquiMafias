import {
  Controller,
  Post,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common'
import { WalletService } from './wallet.service'
import { AdminAddCoinsDto } from './dto/admin-add-coins.dto'
import { SystemRole } from 'src/auth/enums/roles.enum'
import { Roles } from 'src/auth/decorators/roles.decorator'
import { RolesGuard } from 'src/auth/guards/roles.guard'

import { Wallet, TransactionType } from '@prisma/client'
import { GetUser } from 'src/auth/decorators/get-user.decorator'

@Controller('wallet')
@UseGuards(RolesGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) { }

  @Post('my-balance')
  async getMyBalance(@GetUser('id') userId: string): Promise<number> {
    if (!userId) {
      throw new BadRequestException(
        'No se pudo identificar al usuario desde el token.',
      )
    }

    return this.walletService.getBalance(userId)
  }

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
