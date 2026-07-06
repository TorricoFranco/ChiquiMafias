import { Prisma } from '@prisma/client'
import { PrismaService } from 'src/prisma/prisma.service'

type PrismaLike = PrismaService | Prisma.TransactionClient

import { ApiStandingRow } from '../interfaces/apiStandings'

export async function upsertTeamSeasonStats(
  prisma: PrismaLike,
  identifiers: {
    leagueId: string
    season: number
    stage: string
    teamId: string
  },
  apiData: ApiStandingRow,
  groupName: string | null,
) {
  const data = {
    position: apiData.rank,
    points: apiData.points,
    wins: apiData.all.win ?? 0,
    draws: apiData.all.draw ?? 0,
    losses: apiData.all.lose ?? 0,
    goals_for: apiData.all.goals.for,
    goals_against: apiData.all.goals.against,
    goal_diff: apiData.goalsDiff,
    matches_played: apiData.all.played,
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
