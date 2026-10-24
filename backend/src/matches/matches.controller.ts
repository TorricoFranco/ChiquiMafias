import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger'
import { MatchesService } from './matches.service'
import {
  MatchDetailsResponseDto,
  MatchWithCompetitionResponseDto,
} from './dto/response/match-details-response.dto'
import { MatchEventResponseDto } from './dto/response/match-events-response.dto'
import { PreMatchResponseDto } from './dto/response/prematch-response.dto'
import { Public } from 'src/auth/decorators/auth.decorator'
import { CompetitionsService } from 'src/competitions/competitions.service'

@ApiTags('Matches')
@Controller('matches')
@Public()
export class MatchesController {
  constructor(
    private readonly matchesService: MatchesService,
    private readonly competitions: CompetitionsService,
  ) {}

  @Get('leagues/:leagueId/seasons/:season/matches/:matchId')
  @ApiOperation({
    summary: 'Detalles completos de un partido',
    description:
      'Combina datos del fixture, equipos y estado en vivo (cacheado en Redis) para un partido puntual.',
  })
  @ApiParam({ name: 'leagueId', description: 'ID de la liga' })
  @ApiParam({ name: 'season', description: 'Temporada (ej. 2026)' })
  @ApiParam({ name: 'matchId', description: 'ID del partido' })
  @ApiResponse({
    status: 200,
    type: MatchDetailsResponseDto,
  })
  @ApiResponse({ status: 404, description: 'El partido no existe.' })
  async getMatchDetails(
    @Param('leagueId', ParseUUIDPipe) leagueId: string,
    @Param('season') season: string,
    @Param('matchId', ParseUUIDPipe) matchId: string,
  ): Promise<MatchDetailsResponseDto> {
    // Alias de GET /matches/:matchId: solo la Liga y su temporada actual (RF-A04).
    const { competition } = await this.competitions.resolveLegacy(season)
    if (leagueId !== competition.leagueId) {
      throw new NotFoundException('Partido no encontrado')
    }
    return this.matchesService.getMatchDetails(leagueId, season, matchId)
  }

  @Get(':matchId')
  @ApiOperation({
    summary: 'Detalles completos de un partido con su competición',
    description:
      'No hace falta mandar liga ni temporada. Solo partidos de la temporada actual de su competición.',
  })
  @ApiParam({ name: 'matchId', description: 'ID del partido (uuid)' })
  @ApiResponse({ status: 200, type: MatchWithCompetitionResponseDto })
  @ApiResponse({
    status: 404,
    description: 'El partido no existe o no es de la temporada actual.',
  })
  async getMatchDetailsById(
    @Param('matchId', ParseUUIDPipe) matchId: string,
  ): Promise<MatchWithCompetitionResponseDto> {
    return this.matchesService.getMatchDetailsById(matchId)
  }

  @Get(':matchId/events')
  @ApiOperation({ summary: 'Público: Eventos de un partido por matchId' })
  @ApiParam({ name: 'matchId', description: 'ID del partido' })
  @ApiResponse({
    status: 200,
    description:
      'Lista ordenada cronológicamente de los eventos del partido (Goles, Tarjetas, Cambios).',
    type: MatchEventResponseDto,
    isArray: true,
  })
  @ApiResponse({
    status: 404,
    description: 'Eventos no encontrados o partido inexistente',
  })
  async getMatchEvents(
    @Param('matchId', ParseUUIDPipe) matchId: string,
  ): Promise<MatchEventResponseDto[]> {
    await this.matchesService.findCurrentSeasonMatch(matchId)
    const events = await this.matchesService.getMatchEvents(matchId)

    if (!events || events.length === 0) {
      throw new NotFoundException('No se encontraron eventos para este partido')
    }

    return events
  }

  @Get('pre-match/:matchId')
  @ApiOperation({
    summary: 'Público: Información estadística previa al partido por matchId',
  })
  @ApiParam({ name: 'matchId', description: 'ID del partido' })
  @ApiResponse({
    status: 200,
    description:
      'Datos analíticos agregados recolectados de APIs externas (Cacheado en Redis).',
    type: PreMatchResponseDto,
  })
  @ApiResponse({
    status: 404,
    description:
      'El partido no existe en el sistema local para mapear la consulta.',
  })
  async getPreMatchInfo(
    @Param('matchId', ParseUUIDPipe) matchId: string,
  ): Promise<PreMatchResponseDto> {
    // Antes de leer la caché: un partido de otra temporada tampoco sale de Redis.
    await this.matchesService.findCurrentSeasonMatch(matchId)
    return await this.matchesService.getAggregatedData(matchId)
  }
}
