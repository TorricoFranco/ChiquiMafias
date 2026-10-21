import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { FootballDataProvider } from '../football-data.provider'

@Injectable()
export class FootballLeagueService {
  constructor(
    private readonly provider: FootballDataProvider,
    private readonly prisma: PrismaService,
  ) {}

  /** Trae la liga del proveedor y la guarda (upsert) en la DB. */
  async syncLeagueById(leagueExternalId: number, season?: number) {
    const league = await this.provider.getLeague(leagueExternalId, season)

    if (!league) {
      throw new NotFoundException('Liga no encontrada en el proveedor')
    }

    const data = {
      name: league.name,
      logo_url: league.logo,
      country: league.country,
      type: league.type,
    }

    await this.prisma.leagues.upsert({
      where: { api_league_id: league.externalId },
      update: data,
      create: { api_league_id: league.externalId, ...data },
    })

    return league
  }
}
