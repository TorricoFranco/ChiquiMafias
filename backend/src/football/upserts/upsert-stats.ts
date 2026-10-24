import { Prisma } from '@prisma/client'
import { PrismaService } from 'src/prisma/prisma.service'

import { FootballTeamStatistics } from '../football.types'

type PrismaClientLike = PrismaService | Prisma.TransactionClient

export async function upsertMatchStats(
  tx: PrismaClientLike,
  matchId: string,
  stats: FootballTeamStatistics[],
  findTeam: (
    ref: FootballTeamStatistics['team'],
  ) => Promise<{ id: string } | null>,
) {
  for (const item of stats) {
    const team = await findTeam(item.team)

    if (!team) continue

    const statsObj = item.statistics

    await tx.stats_team_match.upsert({
      where: {
        match_id_team_id: { match_id: matchId, team_id: team.id },
      },
      update: {
        data: statsObj,
        updated_at: new Date(),
      },
      create: {
        match_id: matchId,
        team_id: team.id,
        data: statsObj,
      },
    })
  }
}
