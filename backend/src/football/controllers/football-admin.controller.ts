import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { FootballStandingsService } from '../services/standings.service'
import { FootballLeagueService } from '../services/league.service'
import { FootballTeamsService } from '../services/teams.service'
import { RolesGuard } from 'src/auth/guards/roles.guard'
import { Roles } from 'src/auth/decorators/roles.decorator'
import { SystemRole } from 'src/auth/enums/roles.enum'

// Cada request consume cuota del proveedor y varias hacen upserts: solo ADMIN.
// La ruta se mantiene como `api-football` para no romper a quien la use.
@ApiTags('Football (Ingesta admin de datos deportivos)')
@ApiBearerAuth()
@Controller('api-football')
@UseGuards(RolesGuard)
@Roles(SystemRole.ADMIN)
export class FootballAdminController {
  constructor(
    private readonly standingsService: FootballStandingsService,
    private readonly leagueService: FootballLeagueService,
    private readonly teamsService: FootballTeamsService,
  ) {}

  @ApiOperation({
    summary:
      'Traer y persistir (upsert) los datos de una liga desde el proveedor de datos (Solo ADMIN)',
  })
  @ApiQuery({ name: 'league', description: 'ID de la liga en el proveedor' })
  @ApiQuery({
    name: 'season',
    required: false,
    description: 'Temporada (ej. 2025)',
  })
  @ApiResponse({ status: 200, description: 'Datos de la liga.' })
  @Get('league')
  getLeague(@Query('league') league: string, @Query('season') season?: string) {
    return this.leagueService.syncLeagueById(
      Number(league),
      season ? Number(season) : undefined,
    )
  }

  @ApiOperation({
    summary:
      'Traer la tabla de posiciones del proveedor y asegurar los equipos (Solo ADMIN)',
  })
  @ApiQuery({ name: 'season', description: 'Temporada (ej. 2025)' })
  @ApiQuery({ name: 'league', description: 'ID de la liga en el proveedor' })
  @ApiResponse({ status: 200, description: 'Tabla de posiciones.' })
  @Get('standings')
  getStandings(
    @Query('season') season: string,
    @Query('league') league: string,
  ) {
    return this.standingsService.getStandings(Number(season), Number(league))
  }

  @ApiOperation({
    summary: 'Traer los equipos de una liga desde el proveedor (Solo ADMIN)',
  })
  @ApiQuery({ name: 'season', description: 'Temporada (ej. 2025)' })
  @ApiQuery({ name: 'league', description: 'ID de la liga en el proveedor' })
  @ApiResponse({ status: 200, description: 'Lista de equipos de la liga.' })
  @Get('teams')
  getTeams(@Query('season') season: string, @Query('league') league: string) {
    return this.teamsService.getTeamsByLeague(Number(season), Number(league))
  }
}
