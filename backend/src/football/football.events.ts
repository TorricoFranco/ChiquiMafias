/** Lo emite `LiveScoreCron` al cerrar un partido; `StandingCron` recalcula la tabla. */
export const MATCH_FINISHED_EVENT = 'match.finished'

export interface MatchFinishedEvent {
  /** Clave de la competición en Redis (`leagueCacheKey`). */
  leagueId: number | string
  /** uuid de `Leagues`. */
  leagueDbId: string
  season: number
}

/** Canal de Redis con los marcadores en vivo de una competición. */
export const LEAGUE_LIVE_UPDATES_CHANNEL = 'league_live_updates'

export interface LeagueLiveUpdateMessage {
  /** Clave de la competición en Redis (`leagueCacheKey`): la sala vieja `league_<id>`. */
  leagueId: number | string
  /** Slug de la competición: la sala `competition_<slug>`. Null si no tiene. */
  slug: string | null
  /** `LiveMatchData` en JSON, por id de partido. */
  matches: Record<string, string>
}

/** Lo emite `FixturesSyncCron` al terminar de sincronizar una temporada. */
export const FIXTURES_SYNCED_EVENT = 'fixtures.synced'

export interface FixturesSyncedEvent {
  /** uuid de `CompetitionSeason`. */
  seasonId: string
}
