import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger'
import { StandingsService } from './standings.service'
import { FullStandingsResponseDto } from './dto/response/full-standings.dto'
import { Public } from 'src/auth/decorators/auth.decorator'

@ApiTags('Standings (Tablas de Posiciones)')
@Controller('standings')
export class StandingsController {
  constructor(private readonly standingsService: StandingsService) {}

  // Datos públicos como el fixture y los rankings: la vista de Ligas se ve sin sesión.
  @Public()
  @Get('seasons/:season')
  @ApiOperation({
    summary: 'Obtener todas las tablas de una temporada',
    description:
      'Devuelve las tablas del torneo Apertura, Clausura, Tabla Anual y Promedios (Averages) para el año especificado.',
  })
  @ApiParam({
    name: 'season',
    example: '2026',
    description: 'Año de la temporada a consultar',
  })
  @ApiResponse({
    status: 200,
    description: 'Tablas completas obtenidas con éxito de la DB o Caché.',
    type: FullStandingsResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'No hay datos de tabla para la temporada solicitada.',
  })
  async getStandings(
    @Param('season', ParseIntPipe) season: number,
  ): Promise<FullStandingsResponseDto> {
    return this.standingsService.getStandings(season)
  }
}
