import { PrismaService } from 'src/prisma/prisma.service'

export async function getAnnualStandings(
  prisma: PrismaService,
  leagueId: string,
  season: number,
) {
  const rows = await prisma.teamSeasonStats.findMany({
    where: {
      league_id: leagueId,
      season,
    },
    include: {
      team: true,
    },
  })

  const map = new Map<string, any>()

  for (const r of rows) {
    if (!map.has(r.team_id)) {
      map.set(r.team_id, {
        teamId: r.team_id,
        teamName: r.team.name,
        points: 0,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
      })
    }

    const acc = map.get(r.team_id)

    acc.points += r.points
    acc.played += r.matches_played
    acc.wins += r.wins
    acc.draws += r.draws
    acc.losses += r.losses
    acc.goalsFor += r.goals_for
    acc.goalsAgainst += r.goals_against
    acc.goalDiff += r.goal_diff
  }

  return Array.from(map.values())
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff
      return b.goalsFor - a.goalsFor
    })
    .map((r, i) => ({
      position: i + 1,
      ...r,
    }))
}
