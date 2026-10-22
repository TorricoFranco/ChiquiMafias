export interface ResolvedRound {
  /** Ronda traducida, tal como se guarda en `Matches.round`. */
  round: string
  tournament: 'APERTURA' | 'CLAUSURA'
  /** Parte de la clave de caché de la fecha: `fecha:9`, `final`, `octavos`… */
  matchdayKey: string
}

/**
 * Parte de la clave de caché de una ronda ya traducida: `Clausura - 9` da
 * `fecha:9` y `Clausura - cuartos` da `cuartos`.
 */
export function matchdayKeyOf(round: string): string {
  const parts = round.split(' - ')
  const detail = (parts.length >= 2 ? parts[1] : parts[0]).trim()

  return !isNaN(Number(detail))
    ? `fecha:${detail}`
    : detail.toLowerCase().replace(/\s+/g, '_')
}

/**
 * Clave de la competición en Redis y en los eventos: el ID de API-Football
 * para la Liga (las claves de siempre) y el uuid para las competiciones nuevas.
 */
export function leagueCacheKey(league: {
  id: string
  api_league_id: number | null
}): number | string {
  return league.api_league_id ?? league.id
}

/** Clave de Redis con los partidos de una fecha. */
export function fixturesCacheKey(
  leagueKey: number | string,
  season: number,
  tournament: string,
  matchdayKey: string,
): string {
  return `fixtures:${leagueKey}:${season}:${tournament}:${matchdayKey}`
}
