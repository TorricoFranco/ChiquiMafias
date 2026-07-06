import { Injectable } from '@nestjs/common'
import { ApiFootballHttp } from '../http/api-football.http'
import { PrismaService } from 'src/prisma/prisma.service'
import { ApiFootballResponse } from '../interfaces/types'
import { ApiLeagueResponse } from '../interfaces/leagues'

@Injectable()
export class ApiFootballLeagueService {
  constructor(
    private http: ApiFootballHttp,
    private prisma: PrismaService,
  ) {}

  // LEAGUE BY ID
  async getLeagueById(leagueId: number, season?: number) {
    const res = await this.http.get<ApiFootballResponse<ApiLeagueResponse[]>>(
      '/leagues',
      { id: leagueId, season },
    )

    console.log('Upserting league...')
    await this.prisma.leagues.upsert({
      where: { api_league_id: 128 },
      update: {
        name: 'Liga Profesional Argentina',
        logo_url: 'https://media.api-sports.io/football/leagues/128.png',
        country: 'Argentina',
        type: 'League',
      },
      create: {
        api_league_id: 128,
        name: 'Liga Profesional Argentina',
        logo_url: 'https://media.api-sports.io/football/leagues/128.png',
        country: 'Argentina',
        type: 'League',
      },
    })

    // await this.prisma.seasons.upsert({
    //   where: {
    //     league_id_year: {
    //       league_id: league.id,
    //       year: 2026,
    //     },
    //   },
    //   update: {
    //     current: true,
    //     start_date: new Date('2026-01-25'),
    //     end_date: new Date('2026-11-08'),
    //   },
    //   create: {
    //     league_id: league.id,
    //     year: 2026,
    //     current: true,
    //     start_date: new Date('2026-01-25'),
    //     end_date: new Date('2026-11-08'),
    //   },
    // })

    return res.data.response[0]
  }
}
