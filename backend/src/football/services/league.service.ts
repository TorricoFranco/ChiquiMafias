import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { FootballDataProvider } from '../football-data.provider'
import { FootballRefsService } from './refs.service'

@Injectable()
export class FootballLeagueService {
  constructor(
    private readonly provider: FootballDataProvider,
    private readonly prisma: PrismaService,
    private readonly refs: FootballRefsService,
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

    if (this.refs.usesLegacyColumns) {
      await this.prisma.leagues.upsert({
        where: { api_league_id: league.externalId },
        update: data,
        create: { api_league_id: league.externalId, ...data },
      })
    } else {
      const existingId = await this.refs.findInternalId(
        'LEAGUE',
        league.externalId,
      )
      if (existingId) {
        await this.prisma.leagues.update({ where: { id: existingId }, data })
      } else {
        await this.prisma.$transaction(async (tx) => {
          const created = await tx.leagues.create({ data })
          const linkedId = await this.refs.link(
            'LEAGUE',
            created.id,
            league.externalId,
            tx,
          )
          // Si otro proceso la vinculó antes, se descarta la recién creada.
          if (linkedId !== created.id) {
            await tx.leagues.delete({ where: { id: created.id } })
          }
        })
      }
    }

    return league
  }
}
