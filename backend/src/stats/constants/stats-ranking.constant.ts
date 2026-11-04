/** Resultados de cada ranking público de apuestas si no se manda `limit`. */
export const STATS_RANKING_DEFAULT_LIMIT = 10

/**
 * Tope de `limit` en los rankings públicos de apuestas (`top-earners`,
 * `top-streaks`, `highest-multipliers`, `most-active` y `top-stakers`): quien
 * pide más recibe este máximo, no un error. Las rutas son `@Public()` y no
 * filtran usuarios, así que sin tope `?limit=100000` entregaba a todos los
 * usuarios con stats y no solo al top. El front pide 5, 10 o 25
 * (`LeaderboardTable` en `new_frontend/features/stats/components/`), así que el
 * tope no lo afecta. No hay paginación: cada ranking alcanza como mucho a sus
 * primeros 50.
 */
export const STATS_RANKING_MAX_LIMIT = 50
