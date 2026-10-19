import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common'
import { RedisService } from 'src/redis/redis.service'
import { NotFoundException } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ApiFootballHttp } from 'src/api-football/http/api-football.http'
import { ApiFootballResponse } from 'src/api-football/interfaces/types'
import { PrismaService } from 'src/prisma/prisma.service'
import { ApiFixture } from 'src/api-football/interfaces/fixture'
import { SystemRole } from 'src/auth/enums/roles.enum'
import { Roles } from 'src/auth/decorators/roles.decorator'
import { RolesGuard } from 'src/auth/guards/roles.guard'
import { DevToolsGuard } from 'src/auth/guards/dev-tools.guard'

// Solo para desarrollo: requiere ENABLE_DEV_TOOLS=true y rol ADMIN.
@ApiTags('[DEV] Test Events (solo con ENABLE_DEV_TOOLS=true)')
@ApiBearerAuth()
@Controller('test-events')
@UseGuards(DevToolsGuard, RolesGuard)
@Roles(SystemRole.ADMIN)
export class TestEventsController {
  constructor(
    private readonly redisService: RedisService,
    private prisma: PrismaService,
    private http: ApiFootballHttp,
  ) {}

  @ApiOperation({
    summary: '[DEV] Simular el evento LINEUPS_READY de un partido',
    description:
      'Publica en Redis (match_updates) para probar el gateway sin esperar al cron real.',
  })
  // Testear Alineaciones: /test-events/lineups?matchId=ID_DE_TU_PARTIDO
  @Get('lineups')
  async testLineups(@Query('matchId') matchId: string) {
    const payload = {
      matchId: matchId,
      type: 'LINEUPS_READY',
      payload: {
        lineup_fetched: true,
        matchId: matchId,
      },
    }
    await this.redisService.publish('match_updates', payload)
    return { message: 'Evento LINEUPS_READY enviado', payload }
  }

  @ApiOperation({
    summary: '[DEV] Simular una actualización de marcador (MATCH_UPDATE)',
  })
  // Testear Marcador: /test-events/score?matchId=ID_DE_TU_PARTIDO&home=2&away=1
  @Get('score')
  async testScore(
    @Query('matchId') matchId: string,
    @Query('home') home: string,
    @Query('away') away: string,
  ) {
    const payload = {
      matchId: matchId,
      type: 'MATCH_UPDATE', // O el type que maneje tu cron de eventos
      payload: {
        home_goals: parseInt(home),
        away_goals: parseInt(away),
        status: '1H',
        status_long: 'First Half',
        elapsed: 25,
      },
    }
    await this.redisService.publish('match_updates', payload)
    return { message: 'Evento MATCH_UPDATE enviado', payload }
  }

  @ApiOperation({
    summary: '[DEV] Simular el fin de un partido (MATCH_UPDATE con status FT)',
  })
  // Testear Fin de Partido: /test-events/end?matchId=ID_DE_TU_PARTIDO
  @Get('end')
  async testEnd(@Query('matchId') matchId: string) {
    const payload = {
      matchId: matchId,
      type: 'MATCH_UPDATE',
      payload: {
        status: 'FT',
        score: '2-1',
      },
    }
    await this.redisService.publish('match_updates', payload)
    return { message: 'Evento MATCH_UPDATE (FT) enviado', payload }
  }

  @ApiOperation({
    summary:
      '[DEV] Simular un evento completo (gol + tarjeta roja) sobre un partido real de la DB',
  })
  // Testaear eventos de score
  @Get('test-full-event')
  async testFullEvent(
    @Query('matchId') matchId: string,
    @Query('status') status: string = '2H',
    @Query('elapsed') elapsed: string = '85',
  ) {
    // 1. Buscamos el match con los datos de los equipos
    const matchDb = await this.prisma.matches.findUnique({
      where: { id: matchId },
      include: {
        home_team: true,
        away_team: true,
      },
    })

    if (!matchDb) throw new NotFoundException('Match no encontrado')

    // 2. Simulamos el Summary (lo que va al marcador de incidencias)
    const mockSummary = {
      goals: [
        { min: 10, player: 'Lionel Messi', team: matchDb.home_team_id },
        { min: 70, player: 'Kylian Mbappé', team: matchDb.away_team_id },
      ],
      redCards: [
        {
          min: parseInt(elapsed),
          player: 'Marcos Rojo',
          team: matchDb.home_team_id,
        },
      ],
      lastUpdate: new Date(),
    }

    // 3. Simulamos el apiMatch para el SCORE_UPDATED
    const mockApiMatch = {
      goals: { home: 1, away: 1 },
      fixture: {
        status: {
          short: status,
          elapsed: parseInt(elapsed),
          extra: 0,
        },
      },
    }

    // 4. Simulamos el último evento para el EVENTS_UPDATED (Línea de tiempo)
    const mockFormattedEvent = {
      id: `test-red-card-${Date.now()}`,
      minute: parseInt(elapsed),
      extraMinute: null,
      type: 'Card',
      detail: 'Red Card',
      team: { id: matchDb.home_team_id, name: matchDb.home_team.name },
      player: { id: 999, name: 'Marcos Rojo' },
      assist: null,
      created_at: new Date().toISOString(),
      substitutionLog: null,
    }

    await this.publishUpdate(
      matchDb.id,
      mockApiMatch,
      'SCORE_UPDATED',
      mockSummary,
    )

    // B. Mandamos la roja a la línea de tiempo (EVENTS_UPDATED)
    await this.redisService.publish('match_updates', {
      matchId: matchDb.id,
      type: 'EVENTS_UPDATED',
      payload: {
        count: 3,
        lastEvent: mockFormattedEvent,
        status: status,
        eventsSummary: mockSummary,
      },
    })

    return {
      message: 'Eventos de Score y Roja enviados',
      match: `${matchDb.home_team.name} vs ${matchDb.away_team.name}`,
    }
  }
  private async publishUpdate(
    matchId: string,
    apiMatch: any,
    type: string,
    summary: any,
  ) {
    await this.redisService.publish('match_updates', {
      matchId,
      type,
      payload: {
        home_goals: apiMatch.goals.home,
        away_goals: apiMatch.goals.away,

        status: apiMatch.fixture.status.short,
        elapsed: apiMatch.fixture.status.elapsed,
        eventsSummary: summary,
      },
    })
  }

  @ApiOperation({
    summary:
      '[DEV] Simular la actualización en vivo de varios partidos (como lo haría el cron de liga)',
  })
  // Testear Score updated de League Fixture
  // CONTROLLER
  @Post()
  async testLeague(@Body() body: { matches: any[] }) {
    return await this.simulateLeagueUpdate(body.matches)
  }

  // SERVICVE

  async simulateLeagueUpdate(matches: any[]) {
    const LEAGUE_UUID = '6a2a03c5-1054-49e4-96c3-afd2bca9ebd7' // Hardcodeado
    const LEAGUE_NUMERIC_ID = 128 // El ID que usás para las keys de Redis

    const liveScoresHash: Record<string, string> = {}

    for (const match of matches) {
      const matchDb = await this.prisma.matches.findUnique({
        where: { id: match.matchId },
        select: {
          home_team_id: true,
          away_team_id: true,
        },
      })

      if (!matchDb) {
        console.warn(`⚠️ Match ${match.matchId} no existe en DB`)
        continue
      }

      // ARMADO IDÉNTICO AL CRON (Snake Case + JSON.stringify)
      liveScoresHash[match.matchId] = JSON.stringify({
        home_goals: Number(match.h),
        away_goals: Number(match.a),
        home_team_id: matchDb.home_team_id,
        away_team_id: matchDb.away_team_id,
        status_short: match.status || '2H',
        elapsed: match.elapsed || 80,
      })
    }

    if (Object.keys(liveScoresHash).length === 0)
      return { error: 'No valid matches' }

    // 1. Actualizar Hash en Redis (Key igual a la del Cron)
    const cacheKey = `live_scores:league:${LEAGUE_NUMERIC_ID}`
    await this.redisService.redis.hset(cacheKey, liveScoresHash)
    await this.redisService.redis.expire(cacheKey, 300)

    // 2. Publicar al canal que escucha el Gateway
    await this.redisService.publish('league_live_updates', {
      leagueId: LEAGUE_UUID, // Usamos el UUID que espera el room del socket
      matches: liveScoresHash, // Mandamos los strings de JSON
    })

    return { status: 'Sent as Cron', sent: liveScoresHash }
  }
  @ApiOperation({
    summary: '[DEV] Traer un partido de la DB con equipos, liga y estadio',
  })
  // TRAER DATA BD DE MATCHES
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.getMatchById(id)
  }

  async getMatchById(id: string) {
    const match = await this.prisma.matches.findUnique({
      where: { id },
      include: {
        home_team: true, // Trae datos del equipo local
        away_team: true, // Trae datos del equipo visitante
        league: true, // Trae datos de la liga
        venue: true, // Trae datos del estadio (opcional)
      },
    })

    if (!match) {
      throw new NotFoundException(`El partido con ID ${id} no existe`)
    }

    return match
  }

  @ApiOperation({
    summary:
      '[DEV] Forzar manualmente los flags tracked/is_live_finished de un partido',
  })
  @Post('toggle-tracking/:id')
  async toggleTracking(
    @Param('id') id: string,
    @Query('tracked') tracked: string,
    @Query('finished') finished: string,
  ) {
    const isTracked = tracked === 'true'
    const isFinished = finished === 'true'

    const updatedMatch = await this.prisma.matches.update({
      where: { id },
      data: {
        tracked: isTracked,
        is_live_finished: isFinished,
      },
    })

    return {
      message: `Match ${id} actualizado correctamente`,
      data: {
        tracked: updatedMatch.tracked,
        is_live_finished: updatedMatch.is_live_finished,
      },
    }
  }

  // 2. Solo resetea 'is_live_finished' a false para que el cron lo vuelva a tomar
  @ApiOperation({
    summary:
      '[DEV] Resetear is_live_finished para que el cron vuelva a tomar el partido como en vivo',
  })
  // Testear: /test-events/reset-live/:id
  @Post('reset-live/:id')
  async resetLiveStatus(@Param('id') id: string) {
    const updatedMatch = await this.prisma.matches.update({
      where: { id },
      data: {
        is_live_finished: false,
        // Opcionalmente podrías querer asegurar que esté trackeado
        tracked: true,
      },
    })

    return {
      message: `Match ${id} reseteado para tracking en vivo`,
      is_live_finished: updatedMatch.is_live_finished,
      tracked: updatedMatch.tracked,
    }
  }
}
