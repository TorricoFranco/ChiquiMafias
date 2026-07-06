import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { ApiFootballHttp } from '../http/api-football.http'
import { ApiStandingsResponse } from '../interfaces/stadings'
import { ApiFootballResponse } from '../interfaces/types'



import { upsertTeam } from '../upserts/upsert-team'

import { Logger } from '@nestjs/common'

@Injectable()
export class ApiFootballStandingsService {
  private readonly logger = new Logger(ApiFootballStandingsService.name)

  constructor(
    private http: ApiFootballHttp,
    private prisma: PrismaService,
  ) { }

  async getStandings(season: number, league: number) {
    const res = await this.http.get<
      ApiFootballResponse<ApiStandingsResponse[]>
    >('/standings', { league, season })

    const leagueSeason = await this.prisma.leagues.findFirst({
      where: { api_league_id: league },
    })

    if (!leagueSeason) throw new Error('League not found')

    // await this.prisma.teamSeasonStats.deleteMany({
    //   where: {
    //     league_id: leagueSeason.id,
    //     season: season,
    //   },
    // })

    const allStandings = res.data.response[0].league.standings

    for (const standingsArray of allStandings) {
      for (const s of standingsArray) {
        // DETECTAR STAGE Y GRUPO
        const groupRaw = s.group
        let stage = 'APERTURA'
        let groupName: string | undefined = undefined

        if (groupRaw.includes('Anual')) {
          stage = 'ANNUAL'
          groupName = undefined
        } else if (groupRaw.includes('Promedios')) {
          stage = 'AVERAGES'
          groupName = undefined
        } else {
          stage = groupRaw.split(',')[0].toUpperCase()
          groupName = groupRaw.includes('Group B') ? 'B' : 'A'
        }

        // --- UPSERT DEL EQUIPO ---
        const team = await upsertTeam(this.prisma, s.team)

        // --- EL ESCUDO DE SEGURIDAD ---
        if (!team) {
          this.logger.warn(
            `Saltando estadística: No se pudo procesar el equipo ${s.team?.name}`,
          )
          continue // Si el equipo falló, saltamos a la siguiente fila de la tabla
        }
      }
    }
    return res.data
  }

  // EJEMPLO MSTRAR STANDIN DE PREMIER LEAGUE 7293

  // MÉTODO DE PRUEBA TEMPORAL
  async pruebaStandings(season: number, league: number) {
    try {
      this.logger.log(
        `Probando standings para League: ${league}, Season: ${season}`,
      )

      // Tu clase ApiFootballHttp.get ya recibe (url, params)
      // Y ya devuelve una Promesa, así que solo usamos 'await'
      const response = await this.http.get<any>('/standings', {
        season,
        league,
      })

      // Axios pone el cuerpo de la respuesta en '.data'
      const data = response.data

      console.log('--- DEBUG API RESPONSE ---')
      console.log(JSON.stringify(data, null, 2))

      if (!data.response || data.response.length === 0) {
        this.logger.warn('La API respondió pero el array "response" está vacío')
        return { message: 'No hay datos', apiResponse: data }
      }

      return data.response[0].league.standings
    } catch (error) {
      this.logger.error(`Error en pruebaStandings: ${error.message}`)
      throw error
    }
  }
}
