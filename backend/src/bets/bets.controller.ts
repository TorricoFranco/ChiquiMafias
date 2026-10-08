import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { BetsService } from './bets.service'
import { CreateBetDto } from './dto/create-bet.dto'
import { CreateMarketDto } from './dto/create-market.dto'
import { SettleMarketDto } from './dto/settle-market.dto'

import { SystemRole } from 'src/auth/enums/roles.enum'
import { Roles } from 'src/auth/decorators/roles.decorator'
import { RolesGuard } from 'src/auth/guards/roles.guard'
import { GetUser } from 'src/auth/decorators/get-user.decorator'

@ApiTags('Bets (Apuestas)')
@Controller('bets')
export class BetsController {
  constructor(private readonly betsService: BetsService) {}

  @ApiOperation({
    summary: 'Grilla de mercados activos',
    description:
      'Devuelve todos los mercados de apuestas en estado OPEN, con sus opciones y probabilidades actuales (pari-mutuel).',
  })
  @ApiResponse({ status: 200, description: 'Lista de mercados activos.' })
  @Get('markets')
  async getMarkets() {
    return this.betsService.getActiveMarkets()
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Meter una apuesta',
    description:
      'Descuenta el stake de la billetera del usuario y la registra contra una opción de un mercado abierto. La colocación es atómica (Redis/Lua) y el cierre del mercado la rechaza.',
  })
  @ApiResponse({ status: 201, description: 'Apuesta registrada.' })
  @ApiResponse({
    status: 400,
    description:
      'Mercado cerrado/no abierto, opción inexistente, saldo insuficiente u otro error de validación del script de colocación.',
  })
  @Post('place')
  async createBet(@GetUser('id') userId: string, @Body() dto: CreateBetDto) {
    return this.betsService.placeBet(userId, dto)
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Historial de apuestas del usuario logueado',
    description:
      'Devuelve todas las apuestas (abiertas y liquidadas) del usuario autenticado.',
  })
  @ApiResponse({ status: 200, description: 'Lista de apuestas del usuario.' })
  @Get('my-history')
  async getMyHistory(@GetUser('id') userId: string) {
    return this.betsService.getUserBets(userId)
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Crear un mercado de apuestas manual (solo ADMIN)',
    description:
      'Crea un mercado con sus opciones y probabilidades iniciales, sin asociarlo a un fixture automático.',
  })
  @ApiResponse({ status: 201, description: 'Mercado creado.' })
  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN)
  @Post('admin/markets')
  async createMarket(@Body() dto: CreateMarketDto) {
    return this.betsService.createManualMarket(dto)
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Resolver un mercado: liquidar (SETTLED) o reembolsar (REFUNDED) (solo ADMIN)',
    description:
      'Al liquidar paga a los ganadores de `winningOptionId`; al reembolsar devuelve el stake a todos los apostadores. Usa lock optimista sobre el estado del mercado.',
  })
  @ApiParam({ name: 'id', description: 'ID del mercado a resolver' })
  @ApiResponse({ status: 200, description: 'Mercado resuelto.' })
  @ApiResponse({
    status: 400,
    description:
      'Falta `winningOptionId` al liquidar, o el mercado no está en un estado válido para resolverse (ya resuelto o aún no cerrado).',
  })
  @ApiResponse({
    status: 404,
    description: 'El mercado o la opción ganadora no existen.',
  })
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
