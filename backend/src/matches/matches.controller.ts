import { Controller, Get, NotFoundException, Param } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { MatchesService } from './matches.service'
import { MatchDetailsResponseDto } from './dto/response/match-details-response.dto'
import { MatchEventResponseDto } from './dto/response/match-events-response.dto'
import { PreMatchResponseDto } from './dto/response/prematch-response.dto'
import { Public } from 'src/auth/decorators/auth.decorator'

@ApiTags('Matches')
@Controller('matches')
@Public()
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) { }

  @Get('leagues/:leagueId/seasons/:season/matches/:matchId')
  @ApiOperation({ summary: 'Detalles completos de un partido' })
  @ApiResponse({
    status: 200,
    type: MatchDetailsResponseDto,
  })
  async getMatchDetails(
    @Param('leagueId') leagueId: string,
    @Param('season') season: string,
    @Param('matchId') matchId: string,
  ): Promise<MatchDetailsResponseDto> {
    return this.matchesService.getMatchDetails(leagueId, season, matchId)
  }

  @Get(':matchId/events')
  @ApiOperation({ summary: 'Público: Eventos de un partido por matchId' })
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
    @Param('matchId') matchId: string,
  ): Promise<MatchEventResponseDto[]> {
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
    @Param('matchId') matchId: string,
  ): Promise<PreMatchResponseDto> {
    return await this.matchesService.getAggregatedData(matchId)
  }
}
