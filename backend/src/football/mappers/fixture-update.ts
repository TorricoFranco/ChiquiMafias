import { FootballFixture } from '../football.types'
import { mapStatus } from './mapStatus'

/**
 * true si el proveedor da el partido por terminado pero sin marcador. Escribirlo
 * guardaría 0-0 (`?? 0`) y las apuestas se liquidarían como empate.
 */
export function isFinishedWithoutScore(f: FootballFixture): boolean {
  return (
    mapStatus(f.status.short) === 'FINISHED' &&
    (f.goals.home === null || f.goals.away === null)
  )
}

/**
 * Campos de estado y resultado de un partido tal como los escribe el sync del
 * fixture. No incluye ronda, estadio ni árbitro: sirve para corregir un partido
 * que ya existe sin tocar lo demás.
 */
export function toMatchResultUpdate(f: FootballFixture) {
  return {
    date: new Date(f.date),
    timestamp: f.timestamp,
    status: mapStatus(f.status.short),
    status_short: f.status.short,
    status_long: f.status.long,
    elapsed: f.status.elapsed,
    home_goals: f.goals.home ?? 0,
    away_goals: f.goals.away ?? 0,
    home_penalty_goals: f.penalty.home ?? null,
    away_penalty_goals: f.penalty.away ?? null,
  }
}
