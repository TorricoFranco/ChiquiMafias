import type { LiveResult } from '../types';

/** Estados de un partido en juego. */
export const LIVE_STATUSES = ['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE'];

/**
 * Estados de un partido terminado con resultado. Una suspensión o cancelación
 * (`CANC`, `ABD`) no entra: el partido se puede reprogramar y volver a jugarse.
 */
export const FINAL_STATUSES = ['FT', 'AET', 'PEN', 'AWD', 'WO'];

/** Estados con tanda de penales: en curso (`P`) o terminada (`PEN`). */
export const SHOOTOUT_STATUSES = ['P', 'PEN'];

/**
 * Marcador de la tanda, o null si el partido no está en penales. El socket
 * manda 0 cuando no hay tanda: solo cuenta con el estado de penales.
 */
export const shootoutScore = (
  status: string,
  home: number | null | undefined,
  away: number | null | undefined,
): { home: number; away: number } | null =>
  SHOOTOUT_STATUSES.includes(status) && home != null && away != null ? { home, away } : null;

/**
 * El dato en vivo que llegó por socket no pisa a un partido que el servidor ya
 * da por terminado: el último marcador "en vivo" puede ser más viejo que el
 * resultado final (por ejemplo, si el socket se cortó justo al terminar).
 */
export const liveFor = (match: { status_short: string }, live: LiveResult | undefined) =>
  FINAL_STATUSES.includes(match.status_short) ? undefined : live;
