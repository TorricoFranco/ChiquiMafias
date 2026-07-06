export interface ApiStandingTeam {
  id: number
  name: string
  logo: string
}

export interface ApiStandingRow {
  rank: number
  team: ApiStandingTeam
  points: number
  goalsDiff: number
  group: string
  form: string
  description: string | null
  all: {
    played: number
    win: number | null
    draw: number | null
    lose: number | null
    goals: { for: number; against: number }
  }
  update: string
}

export interface ApiFootballStandingsResponse {
  league: {
    id: number
    name: string
    standings: ApiStandingRow[][]
  }
}
