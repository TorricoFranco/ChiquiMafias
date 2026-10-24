/**
 * Contrato propio de datos de fútbol.
 *
 * Los crons, upserts y servicios del módulo `football` hablan SOLO con estos
 * tipos. Cada proveedor externo (API-Football, Highlightly…) los produce desde
 * su formato crudo en `providers/<nombre>/`.
 *
 * Convenciones que el resto de la app ya asume (y que todo proveedor respeta):
 * - `externalId`: ID numérico del proveedor. No es el ID interno (uuid) de la DB.
 * - `status.short`: códigos canónicos `NS, 1H, HT, 2H, ET, BT, P, LIVE, FT, AET,
 *   PEN, PST, SUSP, INT, CANC, ABD, AWD, WO, TBD`. Es lo que se guarda en
 *   `Matches.status_short` y lo que leen los crons. Cada proveedor traduce su
 *   vocabulario a estos códigos.
 * - Eventos: `type` / `detail` con el vocabulario guardado en `MatchEvents`
 *   (`Goal` / `Normal Goal`, `Card` / `Yellow Card`, `subst`, `Var`…).
 * - Estadísticas: claves en snake_case minúscula (`shots_on_goal`,
 *   `ball_possession`…), que es lo que consume el front.
 */

export interface FootballTeamRef {
  externalId: number
  name: string
  logo?: string | null
  code?: string | null
  country?: string | null
  founded?: number | null
}

export interface FootballVenue {
  externalId: number | null
  name: string | null
  city: string | null
  capacity?: number | null
  surface?: string | null
  image?: string | null
}

export interface FootballFixtureSide extends FootballTeamRef {
  /** true si ganó, false si perdió, null si empate o sin resultado. */
  winner: boolean | null
}

export interface FootballFixture {
  externalId: number
  /** ISO 8601. */
  date: string
  /** Segundos desde epoch. */
  timestamp: number
  timezone: string
  referee: string | null
  venue: FootballVenue | null
  status: {
    short: string
    long: string
    elapsed: number | null
  }
  league: {
    externalId: number
    season: number
    /** Etiqueta de ronda tal como la entrega el proveedor. */
    round: string
  }
  home: FootballFixtureSide
  away: FootballFixtureSide
  goals: { home: number | null; away: number | null }
  penalty: { home: number | null; away: number | null }
}

export interface FootballPlayerRef {
  /** null si el proveedor informa el nombre pero no el id. */
  externalId: number | null
  name: string
  position?: string | null
}

export interface FootballEvent {
  minute: number
  extraMinute: number | null
  type: string
  detail: string | null
  team: FootballTeamRef | null
  player: FootballPlayerRef | null
  assist: FootballPlayerRef | null
}

export interface FootballLineupPlayer {
  externalId: number
  name: string
  number: number | null
  /** G, D, M, F */
  position: string | null
  /** Posición en cancha, ej. "1:1". null si el proveedor no la informa. */
  grid: string | null
}

export interface FootballLineup {
  team: FootballTeamRef
  formation: string | null
  coachName: string | null
  /** Colores de camiseta, si el proveedor los informa. */
  kitColors?: unknown
  startXI: FootballLineupPlayer[]
  substitutes: FootballLineupPlayer[]
}

export interface FootballTeamStatistics {
  team: FootballTeamRef
  statistics: Record<string, number | string | null>
}

export interface FootballStandingRow {
  rank: number
  team: FootballTeamRef
  points: number
  goalsDiff: number
  /** Nombre del grupo/fase tal como lo entrega el proveedor. */
  group: string
  form: string
  description: string | null
  played: number
  wins: number | null
  draws: number | null
  losses: number | null
  goalsFor: number
  goalsAgainst: number
}

export interface FootballLeague {
  externalId: number
  name: string
  logo: string | null
  country: string | null
  type: string | null
}

export interface FootballTeamDetail {
  team: FootballTeamRef
  venue: FootballVenue | null
}
