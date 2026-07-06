// bets/bets.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common'
import { BetsService } from './bets.service'
import { CreateBetDto } from './dto/create-bet.dto'
import { CreateMarketDto } from './dto/create-market.dto'
import { SettleMarketDto } from './dto/settle-market.dto'

import { SystemRole } from 'src/auth/enums/roles.enum'
import { Roles } from 'src/auth/decorators/roles.decorator'
import { RolesGuard } from 'src/auth/guards/roles.guard'
import { OptionalAuth } from 'src/auth/decorators/auth.decorator'

@Controller('bets')
export class BetsController {
  constructor(private readonly betsService: BetsService) { }

  /**
   * Trae la grilla completa de mercados activos
   */
  @Get('markets')
  async getMarkets() {
    return this.betsService.getActiveMarkets()
  }

  /**
   * RUTA DE USUARIO: Meter una apuesta
   */
  @OptionalAuth()
  @Post('place')
  async createBet(@Req() req: any, @Body() dto: CreateBetDto) {
    const userId = req.user.id
    return this.betsService.placeBet(userId, dto)
  }

  /**
   * RUTA DE USUARIO: Ver mis apuestas
   */

  @Get('my-history')
  async getMyHistory(@Req() req: any) {
    const userId = req.user.id
    return this.betsService.getUserBets(userId)
  }

  /**
   * Crear un mercado manual
   */
  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN)
  @Post('admin/markets')
  async createMarket(@Req() req: any, @Body() dto: CreateMarketDto) {
    if (req.user.role !== 'ADMIN') {
      throw new BadRequestException(
        'No tenés permisos de administrador para realizar esta acción',
      )
    }
    return this.betsService.createManualMarket(dto)
  }

  /**
   * Resolver un mercado (Ganan/Pierden/Reembolso)
   */
  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN)
  @Post('admin/markets/:id/settle')
  async settleMarket(
    @Req() req: any,
    @Param('id') marketId: string,
    @Body() dto: SettleMarketDto,
  ) {
    if (req.user.role !== 'ADMIN') {
      throw new BadRequestException(
        'No tenés permisos de administrador para realizar esta acción',
      )
    }
    return this.betsService.settleMarket(marketId, dto)
  }
}
