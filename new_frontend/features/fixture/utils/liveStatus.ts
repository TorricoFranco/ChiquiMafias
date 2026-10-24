import type { LiveResult } from '../types';

/** Estados de un partido en juego. */
export const LIVE_STATUSES = ['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE'];

/**
 * Estados de un partido terminado con resultado. Una suspensión o cancelación
 * (`CANC`, `ABD`) no entra: el partido se puede reprogramar y volver a jugarse.
 */
export const FINAL_STATUSES = ['FT', 'AET', 'PEN', 'AWD', 'WO'];

/**
 * El dato en vivo que llegó por socket no pisa a un partido que el servidor ya
 * da por terminado: el último marcador "en vivo" puede ser más viejo que el
 * resultado final (por ejemplo, si el socket se cortó justo al terminar).
 */
export const liveFor = (match: { status_short: string }, live: LiveResult | undefined) =>
  FINAL_STATUSES.includes(match.status_short) ? undefined : live;
