// api-football/fixtures/api-football-fixtures.controller.ts
import { Controller, Get, Param, Query } from '@nestjs/common'
// import { ApiFootballFixturesService } from '../services/fixtures.service'
import { ApiFootballStandingsService } from '../services/standings.service'
import { ApiFootballLeagueService } from '../services/league.service'
import { ApiFootbalTeamsService } from '../services/teams.service'

@Controller('api-football')
export class ApiFootballFixturesController {
  constructor(
    // private readonly fixturesService: ApiFootballFixturesService,
    private readonly standingsService: ApiFootballStandingsService,
    private readonly leagueService: ApiFootballLeagueService,
    private readonly teamsService: ApiFootbalTeamsService,
  ) { }
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

  @Get('standings')
  getStandings(
    @Query('season') season: string,
    @Query('league') league: string,
  ) {
    return this.standingsService.getStandings(Number(season), Number(league))
  }

  @Get('standingsPremierLeague')
  getStandingsPremierLeague(
    @Query('season') season: string,
    @Query('league') league: string,
  ) {
    return this.standingsService.pruebaStandings(Number(season), Number(league))
  }

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
