// ============================================================================
// LEAGUE LIVE EVENTS (fixture.gateway.ts)
// ============================================================================

export interface LeagueLiveScore {
  h: number
  a: number
  hp: number
  ap: number
  homeTeamId: string
  awayTeamId: string
  status: string
  elapsed: number
  isLive: boolean
  isPlayoff: boolean
}

export type LeagueLiveUpdatePayload = Record<string, LeagueLiveScore>

// ============================================================================
// MATCH LIVE EVENTS (matches.gateway.ts)
// ============================================================================

export interface MatchLiveUpdatePayload {
  matchId: string
  // MATCH_ENDED: el partido terminó (cierra el chat y el front recarga el detalle)
  type: 'SCORE_UPDATED' | 'MINUTE_TICK' | 'MATCH_ENDED'
  h: number
  a: number
  status: string
  elapsed: number | null
  // Ver backend/src/matches/utils/match-chat.util.ts
  chatState: 'NOT_STARTED' | 'OPEN' | 'PAUSED' | 'CLOSED'
  chatActive: boolean
}

export interface StatsUpdatedPayload {
  matchId: string
  stats: Array<{
    teamId: string
    teamName: string
    teamLogo: string
    statistics: Record<string, any>
  }>
}

/**
 * `lastEvent` es el evento crudo del proveedor (`toWireEvent` en
 * events-fetch.cron.ts): los ids de equipo y jugador son los del proveedor, no
 * los internos. El front no lo usa para armar la cronología, solo recarga el
 * detalle del partido.
 */
export interface TimelineUpdatedPayload {
  matchId: string
  lastEvent: {
    time: { elapsed: number; extra: number | null }
    team: { id: number; name: string; logo?: string } | null
    player: { id: number; name: string } | null
    assist: { id: number; name: string } | null
    type: string
    detail: string
  } | null
  totalEvents: number
}

export interface GoalScoredPayload {
  matchId: string
  teamId?: string
  player?: string
  minute?: number
}

export interface LineupsUpdatedPayload {
  matchId: string
  lineups: any[]
}

export interface JoinMatchPayload {
  matchId: string
}

export interface MatchMessagePayload {
  matchId: string
  userId: string
  name: string
  teamName: string
  message: string
  timestamp: number
}

// ============================================================================
// CHAT EVENTS (chat.gateway.ts)
// ============================================================================

export interface ChatMessagePayload {
  userId: string
  name: string
  teamName: string
  message: string
  timestamp?: number
}

export interface ClientsChangedPayload {
  id: string
}

// ============================================================================
// SOCKET EVENT EMITTER TYPES
// ============================================================================

export interface ServerToClientEvents {
  // League live updates
  on_league_update: (payload: LeagueLiveUpdatePayload) => void

  // Match live updates
  match_data_update: (payload: any) => void
  match_live_update: (payload: MatchLiveUpdatePayload) => void
  stats_updated: (payload: StatsUpdatedPayload) => void
  timeline_updated: (payload: TimelineUpdatedPayload) => void
  goal_scored: (payload: GoalScoredPayload) => void
  lineups_updated: (payload: LineupsUpdatedPayload) => void
  match_time_update: (payload: Omit<MatchLiveUpdatePayload, 'type'>) => void
  score_changed: (payload: Omit<MatchLiveUpdatePayload, 'type'>) => void

  // Match chat
  on_match_message: (payload: MatchMessagePayload) => void

  // Global chat
  'on-message': (payload: ChatMessagePayload) => void
  'on-clients-changed': (payload: ClientsChangedPayload[]) => void
  'welcome-message': (message: string) => void

  // Connection events
  connect: () => void
  disconnect: () => void
  connect_error: (error: any) => void
}

export interface ClientToServerEvents {
  join_competition: (
    data: { slug: string },
    callback?: (response: { status: 'ok' } | { status: 'error' }) => void,
  ) => void
  leave_competition: (data: { slug: string }) => void
  join_league: (
    data: { leagueId: string },
    callback?: (error: any) => void,
  ) => void
  leave_league: (
    data: { leagueId: string },
    callback?: (error: any) => void,
  ) => void

  join_match: (data: JoinMatchPayload, callback?: (error: any) => void) => void
  leave_match: (
    data: { matchId: string },
    callback?: (error: any) => void,
  ) => void

  send_chat_message: (
    data: { matchId: string; message: string },
    callback?: (error: any) => void,
  ) => void
  'send-message': (
    data: { body: string },
    callback?: (error: any) => void,
  ) => void
}
