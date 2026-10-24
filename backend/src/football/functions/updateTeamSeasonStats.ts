import { PrismaService } from 'src/prisma/prisma.service'

export async function updateTeamSeasonStats(
  prisma: PrismaService,
  matchId: string,
) {
  const match = await prisma.matches.findUnique({
    where: { id: matchId },
    include: {
      // 1. CAMBIO: Ahora incluimos 'events' en lugar de 'goals'
      events: {
        where: {
          type: 'Goal',
          // Si el VAR anuló un gol, no debería estar en la DB con nuestra
          // lógica de sincronización, pero si quieres ser extra precavido:
          // detail: { not: 'Goal disallowed' }
        },
      },
    },
  })

  if (!match) {
    throw new Error(`Match ${matchId} not found`)
  }

  const { league_id, season, home_team_id, away_team_id } = match

  // 2. CAMBIO: Calculamos los goles desde el array de eventos
  const homeGoals = match.events.filter(
    (e) => e.team_id === home_team_id,
  ).length
  const awayGoals = match.events.filter(
    (e) => e.team_id === away_team_id,
  ).length

  // --- El resto de la lógica de puntos se mantiene igual ---
  let homePoints = 0
  let awayPoints = 0

  if (homeGoals > awayGoals) {
    homePoints = 3
  } else if (awayGoals > homeGoals) {
    awayPoints = 3
  } else {
    homePoints = 1
    awayPoints = 1
  }

  // Obtener stage de cada equipo
  const [homeGroup, awayGroup] = await Promise.all([
    prisma.leagueSeasonGroups.findFirst({
      where: { league_id, season, team_id: home_team_id },
    }),
    prisma.leagueSeasonGroups.findFirst({
      where: { league_id, season, team_id: away_team_id },
    }),
  ])

  if (!homeGroup || !awayGroup) {
    throw new Error('Stage not found for one of the teams')
  }

  // UPDATE LOCAL
  await prisma.teamSeasonStats.update({
    where: {
      league_id_season_stage_team_id: {
        league_id,
        season,
        stage: homeGroup.tournament,
        team_id: home_team_id,
      },
    },
    data: {
      matches_played: { increment: 1 },
      goals_for: { increment: homeGoals },
      goals_against: { increment: awayGoals },
      goal_diff: { increment: homeGoals - awayGoals },
      points: { increment: homePoints },
      wins: homePoints === 3 ? { increment: 1 } : undefined,
      draws: homePoints === 1 ? { increment: 1 } : undefined,
      losses: homePoints === 0 ? { increment: 1 } : undefined,
    },
  })

  // UPDATE VISITANTE
  await prisma.teamSeasonStats.update({
    where: {
      league_id_season_stage_team_id: {
        league_id,
        season,
        stage: awayGroup.tournament,
        team_id: away_team_id,
      },
    },
    data: {
      matches_played: { increment: 1 },
      goals_for: { increment: awayGoals },
      goals_against: { increment: homeGoals },
      goal_diff: { increment: awayGoals - homeGoals },
      points: { increment: awayPoints },
      wins: awayPoints === 3 ? { increment: 1 } : undefined,
      draws: awayPoints === 1 ? { increment: 1 } : undefined,
      losses: awayPoints === 0 ? { increment: 1 } : undefined,
    },
  })
}
