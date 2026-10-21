import { Injectable } from '@nestjs/common'
import { FootballDataProvider } from '../../football-data.provider'
import {
  FootballEvent,
  FootballFixture,
  FootballLeague,
  FootballLineup,
  FootballStandingRow,
  FootballTeamDetail,
  FootballTeamStatistics,
} from '../../football.types'
import { ApiFootballHttp } from './api-football.http'
import {
  mapEvent,
  mapFixture,
  mapLeague,
  mapLineup,
  mapStandingRow,
  mapStatistics,
  mapTeamDetail,
} from './api-football.mappers'
import {
  ApiEventRaw,
  ApiFixtureRaw,
  ApiFootballResponse,
  ApiLeagueRaw,
  ApiLineupRaw,
  ApiStandingsRaw,
  ApiStatisticsRaw,
  ApiTeamResponseRaw,
} from './raw/api-football.raw'

@Injectable()
export class ApiFootballProvider extends FootballDataProvider {
  readonly name = 'api-football' as const
  // `fixtures?live=all` se actualiza al ritmo del tick del cron (30 s).
  readonly liveRefreshMs = 30_000

  constructor(private readonly http: ApiFootballHttp) {
    super()
  }

  private async list<T>(url: string, params: Record<string, unknown>) {
    const res = await this.http.get<ApiFootballResponse<T[]>>(url, params)
    return res.data?.response || []
  }

  async getFixtures(params: {
    leagueExternalId: number
    season: number
    from: string
    to: string
  }): Promise<FootballFixture[]> {
    const raw = await this.list<ApiFixtureRaw>('/fixtures', {
      league: params.leagueExternalId,
      season: params.season,
      from: params.from,
      to: params.to,
    })
    return raw.map(mapFixture)
  }

  async getLiveFixtures(leagueExternalId: number): Promise<FootballFixture[]> {
    const raw = await this.list<ApiFixtureRaw>('/fixtures', {
      live: 'all',
      league: leagueExternalId,
    })
    return raw.map(mapFixture)
  }

  async getFixture(externalId: number): Promise<FootballFixture | null> {
    const raw = await this.list<ApiFixtureRaw>('/fixtures', { id: externalId })
    return raw[0] ? mapFixture(raw[0]) : null
  }

  async getEvents(fixtureExternalId: number): Promise<FootballEvent[]> {
    const raw = await this.list<ApiEventRaw>('/fixtures/events', {
      fixture: fixtureExternalId,
    })
    return raw.map(mapEvent)
  }

  async getLineups(fixtureExternalId: number): Promise<FootballLineup[]> {
    const raw = await this.list<ApiLineupRaw>('/fixtures/lineups', {
      fixture: fixtureExternalId,
    })
    return raw.map(mapLineup)
  }

  async getMatchStatistics(
    fixtureExternalId: number,
  ): Promise<FootballTeamStatistics[]> {
    const raw = await this.list<ApiStatisticsRaw>('/fixtures/statistics', {
      fixture: fixtureExternalId,
    })
    return raw.map(mapStatistics)
  }

  async getStandings(
    leagueExternalId: number,
    season: number,
  ): Promise<FootballStandingRow[]> {
    const raw = await this.list<ApiStandingsRaw>('/standings', {
      league: leagueExternalId,
      season,
    })
    const groups = raw[0]?.league?.standings ?? []
    return groups.flat().map(mapStandingRow)
  }

  async getTeams(
    leagueExternalId: number,
    season: number,
  ): Promise<FootballTeamDetail[]> {
    const raw = await this.list<ApiTeamResponseRaw>('/teams', {
      league: leagueExternalId,
      season,
    })
    return raw.map(mapTeamDetail)
  }

  async getLeague(
    leagueExternalId: number,
    season?: number,
  ): Promise<FootballLeague | null> {
    const raw = await this.list<ApiLeagueRaw>('/leagues', {
      id: leagueExternalId,
      season,
    })
    return raw[0] ? mapLeague(raw[0]) : null
  }

  async getHeadToHead(
    teamAExternalId: number,
    teamBExternalId: number,
    last: number,
  ): Promise<FootballFixture[]> {
    const raw = await this.list<ApiFixtureRaw>('/fixtures/headtohead', {
      last,
      h2h: `${teamAExternalId}-${teamBExternalId}`,
    })
    return raw.map(mapFixture)
  }

  async getRecentFinishedFixtures(
    teamExternalId: number,
    last: number,
  ): Promise<FootballFixture[]> {
    const raw = await this.list<ApiFixtureRaw>('/fixtures', {
      team: teamExternalId,
      last,
      status: 'FT',
    })
    return raw.map(mapFixture)
  }
}
