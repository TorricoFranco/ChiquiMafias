import { Injectable } from '@nestjs/common'
import { ApiFootballHttp } from '../http/api-football.http'
import { PrismaService } from 'src/prisma/prisma.service'
import { ApiFootballResponse } from '../interfaces/types'
import { ApiTeamResponse } from '../interfaces/apiTeamResponse'

import { upsertTeam } from '../upserts/upsert-team'
import { upsertVenue } from '../upserts/upsert-venue'

import { downloadTeamLogo } from '../functions/downloadTeamLogo'
import { Logger } from '@nestjs/common'

@Injectable()
export class ApiFootbalTeamsService {
  private readonly logger = new Logger(ApiFootbalTeamsService.name)
  constructor(
    private http: ApiFootballHttp,
    private prisma: PrismaService,
  ) { }

  // INSERT TEAMS, VENUES AND LEAGUE_TEAMS
  async getTeamsByLeague(season: number, leagueApiId: number) {
    const res = await this.http.get<ApiFootballResponse<ApiTeamResponse[]>>(
      '/teams',
      { league: leagueApiId, season },
    )

    const league = await this.prisma.leagues.findFirst({
      where: { api_league_id: leagueApiId },
    })

    if (!league) throw new Error('League not found')

    // await this.prisma.$transaction(async (tx) => {
    //   for (const item of res.data.response) {
    //     // let venueId: string | null = null

    //     // VENUE
    //     // if (item.venue?.id) {
    //     //   const venue = await upsertVenue(tx, item.venue)
    //     //   venueId = venue // Asumo que upsertVenue devuelve el ID (string)
    //     // }

    //     // TEAM
    //     // const team = await upsertTeam(tx, {
    //     //   ...item.team,
    //     // })

    //     // --- EL CHEQUEO DE SEGURIDAD ---
    //     if (!team) {
    //       this.logger.warn(
    //         `Saltando equipo ${item.team?.name}: Datos incompletos`,
    //       )
    //       continue
    //     }

    //     // Ahora team.id es seguro para usar
    //     if (venueId) {
    //       await tx.teams.update({
    //         where: { id: team.id },
    //         data: { venue_id: venueId },
    //       })
    //     }

    //     // LEAGUE_TEAMS
    //     await tx.leagueTeams.upsert({
    //       where: {
    //         league_id_team_id_season: {
    //           league_id: league.id,
    //           team_id: team.id,
    //           season,
    //         },
    //       },
    //       update: {},
    //       create: {
    //         league_id: league.id,
    //         team_id: team.id,
    //         season,
    //       },
    //     })
    //   }
    // })

    return res.data.response
  }

  //  TEAM STATISTICS
  //   async getTeamStatistics(teamId: number, season?: number, league?: number) {
  //     // const res = await this.http.get('/teams/statistics', {
  //     //   team: teamId,
  //     //   season,
  //     //   league,
  //     // })
  //     // return res.data.response
  //     return {
  //       message: 'Team statistics fetched successfully',
  //       teamId,
  //       season,
  //       league,
  //     }
  //   }

  // TEAM LOGOS DOWNLOAD

  async getLogoTeam(season: number, league: number) {
    const res = await this.http.get<ApiFootballResponse<ApiTeamResponse[]>>(
      '/teams',
      { league, season },
    )

    const teams = res.data.response

    teams.forEach((item) => {
      downloadTeamLogo(item.team.id, item.team.logo, league).catch((err) =>
        console.error(`Error bajando logo de ${item.team.name}:`, err),
      )
    })

    return teams
  }
}
