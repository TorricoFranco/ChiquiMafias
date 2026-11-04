/** Comentarios por página de una encuesta si no se manda `limit`. */
export const POLLS_COMMENTS_DEFAULT_LIMIT = 20

/**
 * Tope de `limit` en los comentarios: quien pide más recibe este máximo, no un
 * error. El front pide de a 20 (`getPollComments` en
 * `new_frontend/features/polls/api/pollsApi.ts`, que usa `PollComments.tsx`),
 * así que el tope no lo afecta. La ruta es pública y cada comentario trae su
 * autor, su color de nombre y sus reacciones: sin tope, un anónimo podía bajar
 * todos los de la encuesta en un solo pedido.
 */
export const POLLS_COMMENTS_MAX_LIMIT = 50

/**
 * Tope de `page`. No es un límite de negocio: solo evita que un `page` absurdo
 * desborde el `skip` de Prisma (64 bits) y termine en un 500. Con `limit` en el
 * máximo, el `skip` más grande es 49.999.950. Una página más allá del final
 * vuelve vacía, con el `page` pedido en `meta`.
 */
export const POLLS_COMMENTS_MAX_PAGE = 1_000_000
