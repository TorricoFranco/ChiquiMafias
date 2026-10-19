import { Controller, Get, Param } from '@nestjs/common'

import { ApiResponse, ApiParam, ApiOperation, ApiTags } from '@nestjs/swagger'

import { FixtureService } from './fixture.service'

import { GetFixtureMatchdayResponseDto } from './dto/response/fixture-matchday.dto'
import { GetYearlyCalendarResponseDto } from './dto/response/year-calender.dto'
import { GetPendingFixturesResponseDto } from 'src/fixture/dto/response/pending-match.dto'
import { GetActiveMatchdayResponseDto } from './dto/response/active-matchday.dto'
import { GetLiveScoresResponseDto } from './dto/response/live-score.dto'
import { TournamentBracketsResponseDto } from './dto/response/tournament-bracket.dto'
import { AvailableStagesResponseDto } from './dto/response/available-stages.dto'
import { Public } from 'src/auth/decorators/auth.decorator'

@ApiTags('Fixtures')
@Public()
@Controller('fixtures')
export class FixtureController {
  constructor(private readonly fixturesService: FixtureService) {}

  @Get('seasons/:season/tournaments/:tournament/matchday/:matchday')
  @ApiOperation({
    summary: 'Público: Obtener partidos de una jornada o fase específica',
    description:
      'Devuelve la lista de partidos combinada en tiempo real con Redis para estados live.',
  })
  @ApiParam({
    name: 'season',
    example: '2026',
    description: 'Año de la temporada',
  })
  @ApiParam({
    name: 'tournament',
    example: 'apertura',
    description: 'Nombre del torneo (Apertura / Clausura)',
  })
  @ApiParam({
    name: 'matchday',
    example: 'cuartos',
    description:
      'Número de fecha (ej: "4") o identificador de playoff (ej: "cuartos")',
  })
  @ApiResponse({
    status: 200,
    description: 'Fixture de la fecha procesado y formateado de forma segura.',
    type: GetFixtureMatchdayResponseDto,
  })
  async getByMatchday(
    @Param('season') season: string,
    @Param('tournament') tournament: string,
    @Param('matchday') matchday: string,
  ): Promise<GetFixtureMatchdayResponseDto> {
    return this.fixturesService.getFixtureByMatchday(
      season,
      tournament,
      matchday,
    )
  }

  @Get('seasons/:season/calendar')
  @ApiOperation({
    summary:
      'Público: Obtener el calendario completo de la temporada agrupado por días',
    description:
      'Retorna un listado de días disponibles y los partidos correspondientes a cada fecha (Mapeado a hora local argentina).',
  })
  @ApiParam({
    name: 'season',
    example: '2026',
    description: 'Año de la temporada a consultar',
  })
  @ApiResponse({
    status: 200,
    description: 'Calendario anual estructurado y cacheado.',
    type: GetYearlyCalendarResponseDto,
  })
  async getYearlyCalendar(
    @Param('season') season: string,
  ): Promise<GetYearlyCalendarResponseDto> {
    return await this.fixturesService.getYearlyCalendar(season)
  }

  @Get('pendings/seasons/:season/tournaments/:tournament')
  @ApiOperation({
    summary:
      'Obtener partidos pendientes agrupados por jornadas o eliminación directa',
  })
  @ApiParam({ name: 'season', example: '2026' })
  @ApiParam({
    name: 'tournament',
    example: 'CLAUSURA',
    enum: ['APERTURA', 'CLAUSURA'],
  })
  @ApiResponse({
    status: 200,
    type: GetPendingFixturesResponseDto,
    isArray: true,
    description:
      'Devuelve las fechas pendientes con matchday dinámico (ej: "3" o "semifinal")',
  })
  async getPendingFixtures(
    @Param('season') season: string,
    @Param('tournament') tournament: string,
  ): Promise<GetPendingFixturesResponseDto[]> {
    return this.fixturesService.getPendingFixtures(
      parseInt(season, 10),
      tournament.toUpperCase() as 'APERTURA' | 'CLAUSURA',
    )
  }

  @Get('live-scores')
  @ApiOperation({
    summary: 'Público: Obtener marcadores en vivo',
    description:
      'Trae directamente desde el Hash de Redis todos los partidos que se están jugando en tiempo real con payload ultra optimizado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de partidos actualmente en juego.',
    type: GetLiveScoresResponseDto,
    isArray: true,
  })
  async getLiveScores(): Promise<GetLiveScoresResponseDto[]> {
    return this.fixturesService.getLiveLeagueScores()
  }

  @Get('seasons/:season/tournaments/:tournament/active-matchday')
  @ApiOperation({
    summary: 'Público: Obtener la jornada activa por defecto',
    description:
      'Analiza el estado de los partidos para determinar qué fecha (fase regular o playoff) debería mostrar el Frontend por defecto al abrir la app.',
  })
  @ApiParam({ name: 'season', example: '2026' })
  @ApiParam({
    name: 'tournament',
    example: 'CLAUSURA',
    enum: ['APERTURA', 'CLAUSURA'],
  })
  @ApiResponse({
    status: 200,
    description: 'Retorna la clave de la jornada activa.',
    type: GetActiveMatchdayResponseDto,
  })
  async getActiveMatchday(
    @Param('season') season: string,
    @Param('tournament') tournament: string,
  ): Promise<GetActiveMatchdayResponseDto> {
    const activeDay = await this.fixturesService.getActiveMatchdayInfo(
      season,
      tournament,
    )

    return { active_matchday: activeDay.toString() }
  }

  @Get('seasons/:season/tournaments/:tournament/brackets')
  @ApiOperation({
    summary: 'Obtener el árbol de playoffs (Brackets)',
    description:
      'Devuelve la estructura de eliminatorias desde octavos hasta la final para un torneo y temporada específicos.',
  })
  @ApiParam({
    name: 'season',
    example: '2026',
    description: 'Año de la temporada',
  })
  @ApiParam({
    name: 'tournament',
    example: 'apertura',
    description: 'Nombre del torneo (apertura/clausura)',
  })
  @ApiResponse({
    status: 200,
    description: 'Estructura del bracket obtenida con éxito.',
    type: TournamentBracketsResponseDto,
  })
  async getBrackets(
    @Param('season') season: string,
    @Param('tournament') tournament: string,
  ): Promise<TournamentBracketsResponseDto> {
    return await this.fixturesService.getTournamentBrackets(season, tournament)
  }

  @Get('seasons/:season/tournaments/:tournament/availableStage')
  @ApiOperation({
    summary: 'Obtener etapas y fechas disponibles',
    description:
      'Devuelve los números de las fechas regulares y las rondas de playoff existentes en la DB para armar filtros en la UI.',
  })
  @ApiParam({
    name: 'season',
    example: '2026',
    description: 'Año de la temporada',
  })
  @ApiParam({
    name: 'tournament',
    example: 'apertura',
    description: 'Nombre del torneo',
  })
  @ApiResponse({
    status: 200,
    description: 'Listado de etapas obtenido con éxito.',
    type: AvailableStagesResponseDto,
  })
  async getAvailableStage(
    @Param('season') season: string,
    @Param('tournament') tournament: string,
  ): Promise<AvailableStagesResponseDto> {
    return await this.fixturesService.getAvailableStages(season, tournament)
  }
}
