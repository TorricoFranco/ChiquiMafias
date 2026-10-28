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
// en el minuto extra (120+1, 120+2…, una por equipo). Highlightly lo hace así
// aunque el partido no haya tenido prórroga.
export const SHOOTOUT_MINUTE = 120
export const KICK_DETAILS = ['Penalty', 'Missed Penalty']
const SHOOTOUT_STATUSES = ['P', 'PEN']

/**
 * true si el partido está en la tanda o terminó por penales. El estado alcanza:
 * al empezar la tanda el proveedor puede no mandar todavía el marcador.
 */
export function hasPenaltyShootout(match: {
  status_short: string
  home_penalty_goals: number | null
  away_penalty_goals: number | null
}): boolean {
  return (
    SHOOTOUT_STATUSES.includes(match.status_short) ||
    (match.home_penalty_goals !== null && match.away_penalty_goals !== null)
  )
}

/**
 * Separa los tiros de la tanda del resto de los eventos. Solo hay tanda si el
 * partido la tuvo (`hasPenaltyShootout`); si no, un penal en el 120 es un gol normal.
 */
export function splitPenaltyShootout(
  events: MatchEventResponseDto[],
  hasShootout: boolean,
): { events: MatchEventResponseDto[]; shootout: ShootoutKick[] } {
  if (!hasShootout) return { events, shootout: [] }

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
