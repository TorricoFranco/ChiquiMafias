import { Controller, Get, Query, Param } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { StatsService } from './stats.service'
import { UserStreakService } from './statsUserStreak.service'
import { ChatLeaderboardService } from './ChatLeaderboard.service'
import { Public } from 'src/auth/decorators/auth.decorator'
import { GetUser } from 'src/auth/decorators/get-user.decorator'

@ApiTags('Stats (Estadísticas y rankings)')
@Controller('stats')
export class StatsController {
  constructor(
    private readonly statsService: StatsService,
    private readonly userStreakService: UserStreakService,
    private readonly chatLeaderboardService: ChatLeaderboardService,
  ) {}

  @ApiOperation({ summary: 'Ranking de usuarios con más monedas ganadas' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Cantidad de resultados (default 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios ordenada por monedas ganadas.',
  })
  @Public()
  @Get('top-earners')
  getTopEarners(@Query('limit') limit?: string) {
    return this.statsService.getTopEarners(limit ? Number(limit) : 10)
  }

  @ApiOperation({
    summary: 'Ranking de usuarios con las rachas diarias más largas',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Cantidad de resultados (default 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios ordenada por racha.',
  })
  @Public()
  @Get('top-streaks')
  getTopStreaks(@Query('limit') limit?: string) {
    return this.statsService.getTopStreaks(limit ? Number(limit) : 10)
  }

  @ApiOperation({
    summary:
      'Ranking de usuarios con los multiplicadores de apuestas más altos',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Cantidad de resultados (default 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios ordenada por multiplicador.',
  })
  @Public()
  @Get('highest-multipliers')
  getHighestMultipliers(@Query('limit') limit?: string) {
    return this.statsService.getHighestMultipliers(limit ? Number(limit) : 10)
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Estadísticas personales del usuario logueado' })
  @ApiResponse({ status: 200, description: 'Estadísticas del usuario.' })
  @Get('me')
  getMyStats(@GetUser('id') userId: string) {
    return this.statsService.getUserStats(userId)
  }

  @ApiOperation({ summary: 'Ranking de usuarios más activos en la plataforma' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Cantidad de resultados (default 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios ordenada por actividad.',
  })
  @Public()
  @Get('most-active')
  getMostActive(@Query('limit') limit?: string) {
    return this.statsService.getMostActive(limit ? Number(limit) : 10)
  }

  @ApiOperation({
    summary: 'Ranking de usuarios que más monedas apostaron (stake total)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Cantidad de resultados (default 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios ordenada por stake total.',
  })
  @Public()
  @Get('top-stakers')
  getTopStakers(@Query('limit') limit?: string) {
    return this.statsService.getTopStakers(limit ? Number(limit) : 10)
  }

  @ApiOperation({ summary: 'Estadísticas globales agregadas de la plataforma' })
  @ApiResponse({
    status: 200,
    description: 'Contadores globales de la plataforma.',
  })
  @Public()
  @Get('global')
  getGlobalStats() {
    return this.statsService.getGlobalPlatformStats()
  }

  @ApiOperation({
    summary: 'Ranking de usuarios con rachas activas en este momento',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios con racha activa.',
  })
  @Public()
  @Get('top-active')
  getTopActiveStreaks() {
    return this.userStreakService.getTopActiveStreaks()
  }

  @ApiOperation({ summary: 'Ranking de usuarios con más mensajes en el chat' })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios ordenada por mensajes enviados.',
  })
  @Public()
  @Get('top-chatters')
  getTopChatters() {
    return this.chatLeaderboardService.getTopChatters()
  }
}
