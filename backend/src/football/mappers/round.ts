import { ROUND_MAP } from './roundTranslation'

export interface ResolvedRound {
  /** Ronda traducida, tal como se guarda en `Matches.round`. */
  round: string
  tournament: 'APERTURA' | 'CLAUSURA'
  /** Parte de la clave de caché de la fecha: `fecha:9`, `final`, `octavos`… */
  matchdayKey: string
}

/**
 * Traduce la etiqueta de ronda del proveedor y deriva torneo y fecha.
 * Antes esta lógica estaba copiada en `FixturesSyncCron` y `LiveScoreCron`.
 */
export function resolveRound(
  rawRound: string | null | undefined,
  fallback: string,
): ResolvedRound {
  const round = (rawRound && ROUND_MAP[rawRound]) || rawRound || fallback

  const tournament = round.toUpperCase().includes('CLAUSURA')
    ? 'CLAUSURA'
    : 'APERTURA'

  const parts = round.split(' - ')
  const detail = (parts.length >= 2 ? parts[1] : parts[0]).trim()

  const matchdayKey = !isNaN(Number(detail))
    ? `fecha:${detail}`
    : detail.toLowerCase().replace(/\s+/g, '_')

  return { round, tournament, matchdayKey }
}

/** Clave de Redis con los partidos de una fecha. */
export function fixturesCacheKey(
  leagueExternalId: number,
  season: number,
  tournament: string,
  matchdayKey: string,
): string {
  return `fixtures:${leagueExternalId}:${season}:${tournament}:${matchdayKey}`
}
