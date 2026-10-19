import { Prisma } from '@prisma/client'
import { PrismaService } from 'src/prisma/prisma.service'

type PrismaClientLike = PrismaService | Prisma.TransactionClient

export async function upsertMatchStats(
  tx: PrismaClientLike,
  matchId: string,
  apiResponse: any[],
) {
  for (const item of apiResponse) {
    const team = await tx.teams.findUnique({
      where: { api_team_id: item.team.id },
    })

    if (!team) continue

    const statsObj = item.statistics.reduce(
      (acc: Record<string, any>, stat: any) => {
        if (stat.type) {
          const key = stat.type.toLowerCase().replace(/\s+/g, '_')
          acc[key] = stat.value
        }
        return acc
      },
      {},
    )

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
