import { Injectable } from '@nestjs/common'
import { ApiFootballHttp } from '../http/api-football.http'
import axios from 'axios'
// import { FixturesResponseDTO } from './fixtures.dto'

@Injectable()
export class ApiFootballFixturesService {
  constructor(private http: ApiFootballHttp) {}

  async getBySeason(season: number) {
    try {
      console.log('SEASON:', season)

      const res = await this.http.get('/fixtures', {
        league: 128,
        season,
      })

      console.log('API FOOTBALL RESPONSE OK')
      return res?.data
    } catch (err: any) {
      console.error('ApiFootballFixturesService error:', err?.message ?? err)
      throw err
    }
  }

  private baseUrl = 'https://v3.football.api-sports.io'

  async getRounds(season: number) {
    const res = await axios.get(`${this.baseUrl}/fixtures/rounds`, {
      params: {
        league: 128, // Argentina
        season,
      },
      headers: {
        'x-apisports-key': process.env.API_FOOTBALL_KEY,
      },
    })

    return res.data
  }
}
