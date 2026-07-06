export interface TableEntry {
  rank: number
  teamId: number
  name: string
  logo: string
  points: number
  played: number
  goalsDiff: number
  isTarget: boolean
}

export interface TableEntry {
  rank: number
  teamId: number
  name: string
  logo: string
  points: number
  played: number
  goalsDiff: number
  isTarget: boolean
}

export interface MatchHistoryItem {
  fixture: {
    id: number
    date: string
    venue: { name: string; city: string }
    status: { short: string }
  }
  teams: {
    home: { id: number; name: string; logo: string }
    away: { id: number; name: string; logo: string }
  }
  goals: { home: number; away: number }
}

export interface PreMatchResponse {
  history: {
    homeWins: number
    awayWins: number
    draws: number
    total: number
    lastMatches: MatchHistoryItem[]
  }
  form: {
    home: string
    away: string
  }
  miniTable: {
    tournament: { home: TableEntry[]; away: TableEntry[] }
    annual: { home: TableEntry[]; away: TableEntry[] }
    averages: { home: TableEntry[]; away: TableEntry[] }
  }
}
