type Stage = 'apertura' | 'clausura'
type Group = 'A' | 'B'

import { PrismaService } from 'src/prisma/prisma.service'

export async function calculateStageTable({
  prisma,
  leagueId,
  season,
  stage,
  group,
}: {
  prisma: PrismaService
  leagueId: string
  season: number
  stage: Stage
  group?: Group
}) {
  const stats = await prisma.teamSeasonStats.findMany({
    where: {
      league_id: leagueId,
      season,
      stage,
      ...(group ? { group_name: group } : {}),
    },
    orderBy: [{ points: 'desc' }, { goal_diff: 'desc' }, { goals_for: 'desc' }],
  })

  // actualizar posiciones
  await Promise.all(
    stats.map((s, index) =>
      prisma.teamSeasonStats.update({
        where: { id: s.id },
        data: { position: index + 1 },
      }),
    ),
  )

  console.log('Stage standings:', stats)
  return stats
}
