import { Injectable } from '@nestjs/common'
import { FootballDataProvider } from '../football-data.provider'
import { downloadTeamLogo } from '../functions/downloadTeamLogo'

@Injectable()
export class FootballTeamsService {
  constructor(private readonly provider: FootballDataProvider) {}

  async getTeamsByLeague(season: number, leagueExternalId: number) {
    return this.provider.getTeams(leagueExternalId, season)
  }

  // TEAM LOGOS DOWNLOAD
  async getLogoTeam(season: number, leagueExternalId: number) {
    const teams = await this.provider.getTeams(leagueExternalId, season)

    teams.forEach((item) => {
      if (!item.team.logo) return
      downloadTeamLogo(
        item.team.externalId,
        item.team.logo,
        leagueExternalId,
      ).catch((err) =>
        console.error(`Error bajando logo de ${item.team.name}:`, err),
      )
    })

    return teams
  }
}
