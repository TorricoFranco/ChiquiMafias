import { KICK_DETAILS, SHOOTOUT_MINUTE } from './penalty-shootout.util'

/** Evento tal como llega por `match_updates` (`toWireEvent` en events-fetch.cron.ts). */
export interface BotWireEvent {
  time: { elapsed: number; extra: number | null }
  team: { id: number | null; name: string } | null
  player: { id: number | null; name: string } | null
  type: string
  detail: string
}

/**
 * Qué hace el bot del chat con un evento nuevo:
 * - `GOAL`: gol del partido (normal, en contra o de penal), con su mensaje.
 * - `SHOOTOUT_MISS`: tiro errado en la tanda, con una cargada.
 * - `null`: nada. Incluye los tiros convertidos de la tanda (no son goles del
 *   partido) y los penales errados en el tiempo regular.
 */
export function botReactionTo(
  event: BotWireEvent,
): 'GOAL' | 'SHOOTOUT_MISS' | null {
  if (event.type !== 'Goal') return null

  const isShootoutKick =
    (event.time?.elapsed ?? 0) >= SHOOTOUT_MINUTE &&
    KICK_DETAILS.includes(event.detail)
  if (isShootoutKick) {
    return event.detail === 'Missed Penalty' ? 'SHOOTOUT_MISS' : null
  }

  return event.detail === 'Missed Penalty' ? null : 'GOAL'
}

export function goalMessage(
  teamName: string,
  playerName: string,
  random: () => number = Math.random,
): string {
  const templates = [
    `¡GOOOLASOOO de ${playerName}! ⚽🔥`,
    `¡GOL de ${teamName}! 💥`,
    `¡Apareció ${playerName} para gritar el gol! Agarrate Agarrate 😱`,
    `¡GOL de la ${teamName.toLowerCase()}neta! 🚙💨`,
    `¡Grito sagrado de ${playerName}! Explotó la tribuna 🏟️🔊`,
    `Definió como los dioses... ¡Gooool de ${teamName}! 🏆`,
  ]
  return pick(templates, random)
}

export function shootoutMissMessage(
  playerName: string,
  random: () => number = Math.random,
): string {
  const templates = [
    `¿Para qué te traje, ${playerName}? 🤦`,
    'Tatán tatán... ¡no, Fabiani! Era el penal de la fecha 🎬',
    `Le molestó la luz a ${playerName} 💡`,
    `Erró ${playerName}... viven en un country 🏡`,
  ]
  return pick(templates, random)
}

const pick = (templates: string[], random: () => number) =>
  templates[Math.floor(random() * templates.length)]
