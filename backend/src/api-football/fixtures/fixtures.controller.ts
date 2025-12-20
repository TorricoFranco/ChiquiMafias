// api-football/fixtures/api-football-fixtures.controller.ts
import { Controller, Get, Query } from '@nestjs/common'
import { ApiFootballFixturesService } from './fixtures.service'

@Controller('api-football/fixtures')
export class ApiFootballFixturesController {
  constructor(private readonly fixturesService: ApiFootballFixturesService) {}

  @Get()
  getFixtures(@Query('season') season?: string) {
    if (!season) {
      return {
        error: 'season query param is required',
        example: '?season=2025',
      }
    }

    return this.fixturesService.getBySeason(Number(season))
  }

  @Get('rounds')
  getRounds(@Query('season') season: string) {
    return this.fixturesService.getRounds(Number(season))
  }
}
