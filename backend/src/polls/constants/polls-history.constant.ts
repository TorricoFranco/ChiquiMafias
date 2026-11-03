/** Resultados por página del historial de encuestas cerradas si no se manda `limit`. */
export const POLLS_HISTORY_DEFAULT_LIMIT = 10

/**
 * Tope de `limit` en el historial: quien pide más recibe este máximo, no un
 * error. El front pide de a 10 (`getClosedPolls` en
 * `new_frontend/features/polls/api/pollsApi.ts`), así que el tope no lo afecta.
 */
export const POLLS_HISTORY_MAX_LIMIT = 50

/**
 * Tope de `page`. No es un límite de negocio: solo evita que un `page` absurdo
 * desborde el `skip` de Prisma (64 bits) y termine en un 500. Con `limit` en el
 * máximo, el `skip` más grande es 49.999.950. Una página más allá del final
 * vuelve vacía, con el `page` pedido en `meta`.
 */
export const POLLS_HISTORY_MAX_PAGE = 1_000_000
