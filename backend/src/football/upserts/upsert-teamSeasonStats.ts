import { Prisma } from '@prisma/client'
import { PrismaService } from 'src/prisma/prisma.service'

type PrismaLike = PrismaService | Prisma.TransactionClient

import { FootballStandingRow } from '../football.types'

export async function upsertTeamSeasonStats(
  prisma: PrismaLike,
  identifiers: {
    leagueId: string
    season: number
    stage: string
    teamId: string
  },
  apiData: FootballStandingRow,
  groupName: string | null,
) {
  const data = {
    position: apiData.rank,
    points: apiData.points,
    wins: apiData.wins ?? 0,
    draws: apiData.draws ?? 0,
    losses: apiData.losses ?? 0,
    goals_for: apiData.goalsFor,
    goals_against: apiData.goalsAgainst,
    goal_diff: apiData.goalsDiff,
    matches_played: apiData.played,
    form: apiData.form,
    description: apiData.description,
    group_name: groupName,
    updated_at: new Date(),
  }

  return prisma.teamSeasonStats.upsert({
    where: {
      league_id_season_stage_team_id: {
        league_id: identifiers.leagueId,
        season: identifiers.season,
        stage: identifiers.stage,
        team_id: identifiers.teamId,
      },
    },
    update: data,
    create: {
      ...data,
      league_id: identifiers.leagueId,
      season: identifiers.season,
      stage: identifiers.stage,
      team_id: identifiers.teamId,
    },
  })
}
