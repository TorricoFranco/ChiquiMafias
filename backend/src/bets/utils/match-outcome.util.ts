export type MatchOutcome = 'HOME' | 'DRAW' | 'AWAY' | 'VOID'

// El 1X2 se liquida con el resultado a los 90'. Un partido que se fue al
// alargue (AET) o a penales (PEN) estaba empatado a los 90': es empate, sin
// importar los goles del alargue ni la tanda.
export const FULL_TIME_STATUS = 'FT'
export const DRAW_AFTER_90_STATUSES = ['AET', 'PEN']

// Postergado, cancelado, abandonado o resuelto en escritorio: se reembolsa.
export const VOID_MATCH_STATUSES = ['PST', 'CANC', 'ABD', 'AWD', 'WO']

/**
 * Traduce el estado y los goles del partido al resultado del mercado 1X2.
 * Devuelve null si todavía no se puede liquidar (no empezó, en juego,
 * suspendido temporalmente o sin goles cargados).
 */
export function resolveMatchOutcome(
  statusShort: string,
  homeGoals: number | null,
  awayGoals: number | null,
): MatchOutcome | null {
  if (VOID_MATCH_STATUSES.includes(statusShort)) return 'VOID'
  if (DRAW_AFTER_90_STATUSES.includes(statusShort)) return 'DRAW'

  if (statusShort !== FULL_TIME_STATUS) return null
  if (homeGoals === null || awayGoals === null) return null

  if (homeGoals > awayGoals) return 'HOME'
  if (homeGoals < awayGoals) return 'AWAY'
  return 'DRAW'
}
