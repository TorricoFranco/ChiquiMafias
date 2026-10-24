import { MatchEventResponseDto } from '../dto/response/match-events-response.dto'

/** Un tiro de la tanda de penales. `order` es la ronda: 1.º tiro de cada equipo, 2.º… */
export interface ShootoutKick {
  order: number
  teamId: string
  player: string
  scored: boolean
}

// El proveedor registra los tiros de la tanda como goles (`Penalty`) o
// penales errados (`Missed Penalty`) en el minuto 120, con la ronda del tiro
// en el minuto extra (120+1, 120+2…, una por equipo).
const SHOOTOUT_MINUTE = 120
const KICK_DETAILS = ['Penalty', 'Missed Penalty']

/**
 * Separa los tiros de la tanda del resto de los eventos. Solo hay tanda si el
 * partido tiene marcador de penales; sin él, un penal en el 120 es un gol normal.
 */
export function splitPenaltyShootout(
  events: MatchEventResponseDto[],
  hasPenaltyScore: boolean,
): { events: MatchEventResponseDto[]; shootout: ShootoutKick[] } {
  if (!hasPenaltyScore) return { events, shootout: [] }

  const isKick = (e: MatchEventResponseDto) =>
    e.type === 'Goal' &&
    e.minute >= SHOOTOUT_MINUTE &&
    KICK_DETAILS.includes(e.detail)

  const roundsByTeam = new Map<string, number>()
  const shootout = events
    .filter((e) => isKick(e) && e.team)
    .sort((a, b) => (a.extraMinute ?? 0) - (b.extraMinute ?? 0))
    .map((e) => {
      const teamId = e.team!.id
      const order = (roundsByTeam.get(teamId) ?? 0) + 1
      roundsByTeam.set(teamId, order)
      return {
        order,
        teamId,
        player: e.player?.name ?? 'Jugador',
        scored: e.detail === 'Penalty',
      }
    })

  return { events: events.filter((e) => !isKick(e)), shootout }
}
