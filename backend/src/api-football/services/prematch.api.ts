import { Injectable } from '@nestjs/common'
import { ApiFootballHttp } from '../http/api-football.http'
import { ApiFootballResponse } from '../interfaces/types'

@Injectable()
export class PrematchServiceApi {
  constructor(private readonly httpClient: ApiFootballHttp) {}

  async getH2H(h2h: string) {
    const res = await this.httpClient.get<ApiFootballResponse<any[]>>(
      '/fixtures/headtohead',
      {
        last: 5,
        h2h,
      },
    )
    const response = res.data?.response || []
    return response.filter(
      (m) =>
        m.fixture.status.short === 'FT' || m.fixture.status.short === 'PEN',
    )
  }
  async getLatestResults(teamId: string): Promise<string> {
  const res = await this.httpClient.get<ApiFootballResponse<any[]>>(
    '/fixtures',
    {
      team: teamId,
      last: 5,
      status: 'FT',
    },
  )

  const fixtures = res.data?.response || []

  return fixtures
    .map((match) => {
      const isHome = String(match.teams.home.id) === teamId
      const isAway = String(match.teams.away.id) === teamId

      if (match.teams.home.winner === null) return 'D'

      if (isHome && match.teams.home.winner === true) return 'W'
      
      if (isAway && match.teams.away.winner === true) return 'W'

      return 'L'
    })
    .join('')
}

  async getStandings(leagueId: string, season: number) {
    const res = await this.httpClient.get<ApiFootballResponse<any[]>>(
      '/standings',
      { league: 128, season: season },
    )
    const data = res.data.response[0].league.standings || []
    
    return data
  }


}
