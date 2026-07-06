export interface ApiStanding {
  rank: number
  team: {
    id: number
    name: string
    logo: string
  }
  points: number
  goalsDiff: number
  group: string
  form: string
  status: string
  description: string
  update: string
  all: {
    played: number
    win: number
    draw: number
    lose: number
    goals: {
      for: number
      against: number
    }
  }
}

export interface ApiStandingsResponse {
  league: {
    id: number
    name: string
    season: number
    standings: ApiStanding[][]
  }
}
