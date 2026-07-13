import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common'
import { BetsService } from './bets.service'
import { CreateBetDto } from './dto/create-bet.dto'
import { CreateMarketDto } from './dto/create-market.dto'
import { SettleMarketDto } from './dto/settle-market.dto'

import { SystemRole } from 'src/auth/enums/roles.enum'
import { Roles } from 'src/auth/decorators/roles.decorator'
import { RolesGuard } from 'src/auth/guards/roles.guard'
import { GetUser } from 'src/auth/decorators/get-user.decorator'

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
  @Post('place')
  async createBet(@GetUser('id') userId: string, @Body() dto: CreateBetDto) {
    return this.betsService.placeBet(userId, dto)
  }

  /**
   * RUTA DE USUARIO: Ver mis apuestas
   */

  @Get('my-history')
  async getMyHistory(@GetUser('id') userId: string) {
    return this.betsService.getUserBets(userId)
  }

  /**
   * Crear un mercado manual
   */
  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN)
  @Post('admin/markets')
  async createMarket(@Body() dto: CreateMarketDto) {
    return this.betsService.createManualMarket(dto)
  }

  /**
   * Resolver un mercado (Ganan/Pierden/Reembolso)
   */
  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN)
  @Post('admin/markets/:id/settle')
  async settleMarket(
    @Param('id') marketId: string,
    @Body() dto: SettleMarketDto,
  ) {
    return this.betsService.settleMarket(marketId, dto)
  }
}
