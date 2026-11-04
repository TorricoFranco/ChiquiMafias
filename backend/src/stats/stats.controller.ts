import { Controller, Get, Query } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { StatsService } from './stats.service'
import { UserStreakService } from './statsUserStreak.service'
import { ChatLeaderboardService } from './ChatLeaderboard.service'
import { StatsRankingQueryDto } from './dto/stats-ranking-query.dto'
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
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios ordenada por monedas ganadas.',
  })
  @ApiResponse({ status: 400, description: 'limit no es un número entero.' })
  @Public()
  @Get('top-earners')
  getTopEarners(@Query() query: StatsRankingQueryDto) {
    return this.statsService.getTopEarners(query.limit)
  }

  @ApiOperation({
    summary: 'Ranking de usuarios con las rachas diarias más largas',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios ordenada por racha.',
  })
  @ApiResponse({ status: 400, description: 'limit no es un número entero.' })
  @Public()
  @Get('top-streaks')
  getTopStreaks(@Query() query: StatsRankingQueryDto) {
    return this.statsService.getTopStreaks(query.limit)
  }

  @ApiOperation({
    summary:
      'Ranking de usuarios con los multiplicadores de apuestas más altos',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios ordenada por multiplicador.',
  })
  @ApiResponse({ status: 400, description: 'limit no es un número entero.' })
  @Public()
  @Get('highest-multipliers')
  getHighestMultipliers(@Query() query: StatsRankingQueryDto) {
    return this.statsService.getHighestMultipliers(query.limit)
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Estadísticas personales del usuario logueado' })
  @ApiResponse({ status: 200, description: 'Estadísticas del usuario.' })
  @Get('me')
  getMyStats(@GetUser('id') userId: string) {
    return this.statsService.getUserStats(userId)
  }

  @ApiOperation({ summary: 'Ranking de usuarios más activos en la plataforma' })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios ordenada por actividad.',
  })
  @ApiResponse({ status: 400, description: 'limit no es un número entero.' })
  @Public()
  @Get('most-active')
  getMostActive(@Query() query: StatsRankingQueryDto) {
    return this.statsService.getMostActive(query.limit)
  }

  @ApiOperation({
    summary: 'Ranking de usuarios que más monedas apostaron (stake total)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios ordenada por stake total.',
  })
  @ApiResponse({ status: 400, description: 'limit no es un número entero.' })
  @Public()
  @Get('top-stakers')
  getTopStakers(@Query() query: StatsRankingQueryDto) {
    return this.statsService.getTopStakers(query.limit)
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
