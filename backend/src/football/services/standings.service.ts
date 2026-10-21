import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { FootballDataProvider } from '../football-data.provider'
import { upsertTeam } from '../upserts/upsert-team'

@Injectable()
export class FootballStandingsService {
  private readonly logger = new Logger(FootballStandingsService.name)

  constructor(
    private readonly provider: FootballDataProvider,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Trae la tabla del proveedor y asegura que existan los equipos en la DB.
   * La tabla en sí la persiste `StandingCron`.
   */
  async getStandings(season: number, leagueExternalId: number) {
    const rows = await this.provider.getStandings(leagueExternalId, season)

    const league = await this.prisma.leagues.findFirst({
      where: { api_league_id: leagueExternalId },
    })

    if (!league) throw new NotFoundException('Liga no encontrada')

    for (const row of rows) {
      const team = await upsertTeam(this.prisma, row.team)

      if (!team) {
        this.logger.warn(
          `Saltando estadística: No se pudo procesar el equipo ${row.team?.name}`,
        )
      }
    }

    return rows
  }
}
