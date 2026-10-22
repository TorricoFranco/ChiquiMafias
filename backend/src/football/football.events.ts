/** Lo emite `LiveScoreCron` al cerrar un partido; `StandingCron` recalcula la tabla. */
export const MATCH_FINISHED_EVENT = 'match.finished'

export interface MatchFinishedEvent {
  /** Clave de la competición en Redis (`leagueCacheKey`). */
  leagueId: number | string
  /** uuid de `Leagues`. */
  leagueDbId: string
  season: number
}
