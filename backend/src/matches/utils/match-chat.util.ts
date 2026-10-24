/**
 * Estado del chat de un partido, decidido solo por el estado del partido
 * (ERS RF-A14). El backend lo decide y el front lo refleja:
 * - NOT_STARTED: todavía no empezó (o se postergó). Se muestra un aviso.
 * - OPEN: en juego. Se puede escribir.
 * - PAUSED: suspendido o interrumpido. Se muestra un aviso; se reabre si sigue.
 * - CLOSED: terminó, se canceló o se resolvió en escritorio. No hay chat.
 */
export type MatchChatState = 'NOT_STARTED' | 'OPEN' | 'PAUSED' | 'CLOSED'

const OPEN_STATUSES = ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE']
const PAUSED_STATUSES = ['SUSP', 'INT']
const CLOSED_STATUSES = ['FT', 'AET', 'PEN', 'AWD', 'WO', 'CANC', 'ABD']

export function getMatchChatState(
  statusShort: string | null | undefined,
): MatchChatState {
  const status = statusShort ?? ''
  if (OPEN_STATUSES.includes(status)) return 'OPEN'
  if (PAUSED_STATUSES.includes(status)) return 'PAUSED'
  if (CLOSED_STATUSES.includes(status)) return 'CLOSED'
  return 'NOT_STARTED'
}

export function isMatchChatOpen(statusShort: string | null | undefined) {
  return getMatchChatState(statusShort) === 'OPEN'
}

/** Caché del estado del partido que consulta el chat al recibir un mensaje. */
export const matchStatusCacheKey = (matchId: string) =>
  `match:${matchId}:status`
export const MATCH_STATUS_CACHE_TTL_SECONDS = 30
