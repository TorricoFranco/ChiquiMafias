// Formato crudo de Highlightly (soccer.highlightly.net). Verificado contra
// respuestas reales de la Liga Profesional 2026. Solo lo usa este proveedor.

export interface HlTeamBasic {
  id: number
  name: string
  logo?: string
}

export interface HlMatchState {
  /** Minuto actual; null si no empezó. */
  clock: number | null
  score: {
    /** "1 - 1" (sin penales). null si no empezó. */
    current: string | null
    /** "4 - 3" de la tanda de penales, si hubo. */
    penalties: string | null
  }
  /** Ver `mapStatus` en highlightly.mappers.ts. */
  description: string
}

export interface HlMatch {
  id: number
  /** "Clausura - 13". */
  round: string
  /** ISO 8601 en UTC. */
  date: string
  homeTeam: HlTeamBasic
  awayTeam: HlTeamBasic
  league: { id: number; season: number; name?: string; logo?: string }
  state: HlMatchState
}

export interface HlEvent {
  team: HlTeamBasic
  /** "45", "45+2". */
  time: string
  type: string
  player: string | null
  playerId: number | null
  /** Asistente en un gol; null en otros eventos. */
  assist: string | null
  assistingPlayerId: number | null
  /** En una sustitución, el jugador que entra. */
  substituted: string | null
}

export interface HlStatistic {
  displayName: string
  value: number | string | null
}

export interface HlTeamStatistics {
  team: HlTeamBasic
  statistics: HlStatistic[]
}

/** Respuesta de `/matches/{id}` (viene como array de un elemento). */
export interface HlMatchDetail extends HlMatch {
  venue?: {
    city?: string | null
    name?: string | null
    country?: string | null
    /** Viene como string: "3000". */
    capacity?: string | number | null
  } | null
  referee?: { name?: string | null; nationality?: string | null } | null
  events?: HlEvent[]
  statistics?: HlTeamStatistics[]
}

export interface HlLineupPlayer {
  id?: number
  name: string
  number: number | null
  /** Goalkeeper | Defender | Midfielder | Forward. */
  position: string | null
}

export interface HlLineupTeam extends HlTeamBasic {
  formation: string | null
  /** Filas: la primera es el arquero, luego una por línea de la formación. */
  initialLineup: HlLineupPlayer[][]
  substitutes: HlLineupPlayer[]
}

export interface HlLineups {
  homeTeam: HlLineupTeam
  awayTeam: HlLineupTeam
}

export interface HlStandingBlock {
  games: number
  wins: number
  draws: number
  loses: number
  scoredGoals: number
  receivedGoals: number
}

export interface HlStandingRow {
  team: HlTeamBasic
  position: number
  points: number
  total: HlStandingBlock
  home?: HlStandingBlock
  away?: HlStandingBlock
}

export interface HlStandings {
  groups: { name: string; standings: HlStandingRow[] }[]
}

export interface HlPaged<T> {
  data: T[]
  pagination: { totalCount: number; offset: number; limit: number }
}

export interface HlLeague {
  id: number
  name: string
  logo?: string
  country?: { code?: string; name?: string }
  seasons?: { season: number }[]
}
