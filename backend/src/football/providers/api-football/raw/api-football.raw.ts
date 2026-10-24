// Formato crudo de API-Football (v3). Solo lo usa este proveedor: el resto del
// módulo trabaja con los tipos de `football.types.ts`.

export interface ApiFootballResponse<T> {
  response: T
}

export interface ApiTeamBasic {
  id: number
  name: string
  logo?: string
  code?: string | null
  country?: string | null
  founded?: number | null
}

export interface ApiFixtureRaw {
  fixture: {
    id: number
    date: string
    timestamp: number
    timezone: string
    referee: string | null
    status: { short: string; long: string; elapsed: number | null }
    venue?: {
      id: number | null
      name: string | null
      city: string | null
    }
  }
  league: { id: number; season: number; round: string; country?: string }
  teams: {
    home: ApiTeamBasic & { winner?: boolean | null }
    away: ApiTeamBasic & { winner?: boolean | null }
  }
  goals: { home: number | null; away: number | null }
  score?: {
    penalty?: { home: number | null; away: number | null }
  }
}

export interface ApiEventRaw {
  time: { elapsed: number; extra?: number | null }
  team: ApiTeamBasic | null
  player: { id: number | null; name: string | null } | null
  assist: { id: number | null; name: string | null } | null
  type: string
  detail: string | null
}

export interface ApiLineupPlayerRaw {
  player: {
    id: number
    name: string
    number: number | null
    pos: string | null
    grid: string | null
  }
}

export interface ApiLineupRaw {
  team: ApiTeamBasic & { colors?: unknown }
  formation: string | null
  coach?: { name?: string | null } | null
  startXI: ApiLineupPlayerRaw[] | null
  substitutes: ApiLineupPlayerRaw[] | null
}

export interface ApiStatisticsRaw {
  team: ApiTeamBasic
  statistics: { type?: string | null; value: number | string | null }[]
}

export interface ApiStandingRowRaw {
  rank: number
  team: ApiTeamBasic
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
}

export interface ApiStandingsRaw {
  league: { standings: ApiStandingRowRaw[][] }
}

export interface ApiTeamResponseRaw {
  team: ApiTeamBasic
  venue?: {
    id: number | null
    name: string | null
    city?: string | null
    capacity?: number | null
    surface?: string | null
    image?: string | null
  } | null
}

export interface ApiLeagueRaw {
  league: {
    id: number
    name: string
    country: string
    logo: string
    type: string
  }
}
