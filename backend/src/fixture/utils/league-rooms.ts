/** Sala con los marcadores en vivo de una competición (ERS RNF-S03). */
export const competitionRoom = (slug: string) => `competition_${slug}`
/** Sala vieja, por clave de Redis (`league_128`). Alias hasta el deploy del front nuevo. */
export const legacyLeagueRoom = (leagueKey: number | string) =>
  `league_${leagueKey}`
