import { Prisma } from '@prisma/client'
import { publicUserSelect } from 'src/prisma/constants/publicUserSelect'

/**
 * Autor de una encuesta de la comunidad: el mismo recorte público que usan las
 * tablas de stats (nombre, equipo con escudo y tier de suscripción).
 */
export const pollAuthorSelect = {
  id: true,
  ...publicUserSelect,
} satisfies Prisma.UserSelect

/** Moderador que publicó una encuesta oficial. Solo para la moderación. */
export const pollAdminSelect = {
  id: true,
  name: true,
  username: true,
} satisfies Prisma.UserSelect

/**
 * Una encuesta oficial no expone a ninguna persona: el moderador que la publicó
 * queda guardado en `createdByAdminId` solo para auditoría. Las propuestas de la
 * comunidad sí muestran a su autor.
 */
export function resolvePollAuthor<T>(poll: {
  isOfficial: boolean
  user: T | null
}): T | null {
  return poll.isOfficial ? null : poll.user
}
