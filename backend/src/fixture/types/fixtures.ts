export interface BracketMatch {
  id: string
  side: 'left' | 'right' | 'center'
  position: number
  home_team: { name: string; logo_url: string | null }
  away_team: { name: string; logo_url: string | null }
  status_short: string
  round: string
  home_goals: number | null
  away_goals: number | null
  home_penalty_goals: number | null
  away_penalty_goals: number | null
  date?: string
  [key: string]: any
}

// types/league.ts

export interface TeamInfo {
  name: string
  logo_url: string
}

export interface CalendarMatch {
  id: string
  date: string
  home_goals: number | null
  away_goals: number | null
  home_penalties: number | null
  away_penalties: number | null
  status_short: string
  elapsed: number
  is_live: boolean
  is_playoff: boolean
  round: string
  home_team: TeamInfo
  away_team: TeamInfo
  home_team_id: string
  away_team_id: string
}

export interface YearlyCalendarResponse {
  season: string
  availableDays: string[]
  calendar: Record<string, CalendarMatch[]>
}

export interface LiveMatchData {
  home_goals: number
  away_goals: number
  home_penalty_goals: number | null
  away_penalty_goals: number | null
  status_short: string
  elapsed: number | null
  home_team_id: string
  away_team_id: string
  round: string
}
