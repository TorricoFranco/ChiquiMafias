// api-football/fixtures/api-football-fixtures.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
// import { ApiFootballFixturesService } from '../services/fixtures.service'
import { ApiFootballStandingsService } from '../services/standings.service'
import { ApiFootballLeagueService } from '../services/league.service'
import { ApiFootbalTeamsService } from '../services/teams.service'
import { RolesGuard } from 'src/auth/guards/roles.guard'
import { Roles } from 'src/auth/decorators/roles.decorator'
import { SystemRole } from 'src/auth/enums/roles.enum'

// Cada request consume cuota de API-Football y varias hacen upserts: solo ADMIN.
@ApiTags('API-Football (Ingesta admin de datos deportivos)')
@ApiBearerAuth()
@Controller('api-football')
@UseGuards(RolesGuard)
@Roles(SystemRole.ADMIN)
export class ApiFootballFixturesController {
  constructor(
    // private readonly fixturesService: ApiFootballFixturesService,
    private readonly standingsService: ApiFootballStandingsService,
    private readonly leagueService: ApiFootballLeagueService,
    private readonly teamsService: ApiFootbalTeamsService,
  ) {}

  @ApiOperation({
    summary:
      'Traer y persistir (upsert) los datos de una liga desde API-Football (Solo ADMIN)',
  })
  @ApiQuery({ name: 'league', description: 'ID de la liga en API-Football' })
  @ApiQuery({
    name: 'season',
    required: false,
    description: 'Temporada (ej. 2025)',
  })
  @ApiResponse({ status: 200, description: 'Datos de la liga.' })
  @Get('league')
  getLeague(@Query('league') league: string, @Query('season') season?: string) {
    return this.leagueService.getLeagueById(Number(league), Number(season))
  }

  // @Get('fixtures')
  // getFixtures(
  //   @Query('season') season?: string,
  //   @Query('league') league?: string,
  // ) {
  //   return this.fixturesService.getBySeason(Number(season), Number(league))
  // }

  // @Get('fixtures/date')
  // getFixtureById(
  //   @Query('season') season?: string,
  //   @Query('league') league?: string,
  //   @Query('toDate') toDate?: string,
  // ) {
  //   return this.fixturesService.getFixturesByDateRange(
  //     Number(league),
  //     Number(season),
  //     Number(toDate),
  //   )
  // }

  @ApiOperation({
    summary:
      'Traer y persistir (upsert) la tabla de posiciones desde API-Football (Solo ADMIN)',
  })
  @ApiQuery({ name: 'season', description: 'Temporada (ej. 2025)' })
  @ApiQuery({ name: 'league', description: 'ID de la liga en API-Football' })
  @ApiResponse({ status: 200, description: 'Tabla de posiciones.' })
  @Get('standings')
  getStandings(
    @Query('season') season: string,
    @Query('league') league: string,
  ) {
    return this.standingsService.getStandings(Number(season), Number(league))
  }

  @ApiOperation({
    summary: 'Variante de prueba de la tabla de posiciones (Solo ADMIN)',
  })
  @ApiQuery({ name: 'season', description: 'Temporada (ej. 2025)' })
  @ApiQuery({ name: 'league', description: 'ID de la liga en API-Football' })
  @ApiResponse({ status: 200, description: 'Tabla de posiciones.' })
  @Get('standingsPremierLeague')
  getStandingsPremierLeague(
    @Query('season') season: string,
    @Query('league') league: string,
  ) {
    return this.standingsService.pruebaStandings(Number(season), Number(league))
  }

  @ApiOperation({
    summary:
      'Traer y persistir (upsert) los equipos de una liga desde API-Football (Solo ADMIN)',
  })
  @ApiQuery({ name: 'season', description: 'Temporada (ej. 2025)' })
  @ApiQuery({ name: 'league', description: 'ID de la liga en API-Football' })
  @ApiResponse({ status: 200, description: 'Lista de equipos de la liga.' })
  @Get('teams')
  getTeams(@Query('season') season: string, @Query('league') league: string) {
    console.log(season, league)
    return this.teamsService.getTeamsByLeague(Number(season), Number(league))
  }

  // @Get('rounds')
  // getRounds(@Query('season') season: string, @Query('league') league?: string) {
  //   return this.fixturesService.getRounds(Number(season), Number(league))
  // }

  // Ejemplod de llamada pasando solo el match id
  // http://localhost:3007/api-football/events/868086
  // @Get('events/:id')
  // async getEvents(@Param('id') id: string) {
  //   return this.fixturesService.getMatchEvents(id)
  // }

  // @Get('statics/:id')
  // async getStatics(@Param('id') id: string) {
  //   return this.fixturesService.getStatics(id)
  // }

  // // Ver tracked true
  // @Get('tracked-matches')
  // getTrackedMatches() {
  //   return this.fixturesService.getTrackedMatches()
  // }

  // PROBANDO ENDPOINT DE LAS LLAVES
  // @Get('playoffs-debug')
  // async debugPlayoffs(@Query('season') season: string) {
  //   const LEAGUE_ID = 128
  //   const targetSeason = season || '2025'

  //   return this.fixturesService.getTest(LEAGUE_ID, targetSeason)
  // }
}
