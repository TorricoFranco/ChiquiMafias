import { Prisma } from '@prisma/client'

export type TeamStatsWithTeam = Prisma.TeamSeasonStatsGetPayload<{
  include: { team: true }
}>

export interface StandingRow {
  position: number
  teamId: string
  teamName: string
  teamLogo: string | null
  points: number
  played: number
  won: number
  draw: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  description: string | null
}

export interface AverageRow {
  teamId: string
  teamName: string
  teamLogo: string | null
  description: string | null
  stats2024: { pts: number; pj: number }
  stats2025: { pts: number; pj: number }
  stats2026: { pts: number; pj: number }
  totalPoints: number
  totalPlayed: number
  coefficient: number
}

export interface FullStandings {
  apertura: TournamentData
  clausura: TournamentData
  annual: StandingRow[]
  averages: AverageRow[]
  updated_at: string
}

export interface TournamentData {
  tournament: string
  groups: {
    A: StandingRow[]
    B: StandingRow[]
  }
}

export interface FullStandings {
  apertura: {
    tournament: string
    groups: { A: StandingRow[]; B: StandingRow[] }
  }
  clausura: {
    tournament: string
    groups: { A: StandingRow[]; B: StandingRow[] }
  }
  annual: StandingRow[]
  averages: AverageRow[]
  updated_at: string
}
