export interface ApiFixture {
  fixture: {
    id: number
    date: string
    timestamp: number
    timezone: string
    referee: string | null
    tracked?: boolean
    lineup_fetched?: boolean
    status: {
      short: string
      long: string
      elapsed: number | null
    }
    venue?: {
      id: number | null
      name: string | null
      city: string | null
    }
  }
  league: {
    id: number
    season: number
    round: string
    country: string
  }
  teams: {
    home: {
      id: number
      name: string
      logo: string
      winner?: boolean | null
    }
    away: {
      id: number
      name: string
      logo: string
      winner?: boolean | null
    }
  }
  goals: {
    home: number | null
    away: number | null
  }

  score: {
    halftime: { home: number | null; away: number | null }
    fulltime: { home: number | null; away: number | null }
    extratime: { home: number | null; away: number | null }
    penalty: { home: number | null; away: number | null }
  }
}
