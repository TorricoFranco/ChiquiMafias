import { Prisma, SubscriptionTier } from '@prisma/client'

/**
 * Autor de un comentario: lo que se ve en una vista común (solo el @username,
 * nunca el nombre ni el correo), con el escudo de su equipo, el plan de
 * suscripción vigente y el color de nombre equipado, como en el chat.
 */
export const commentAuthorSelect = {
  id: true,
  username: true,
  activeSubscriptionTier: true,
  activeNameColorId: true,
  team: { select: { badgeUrl: true } },
} satisfies Prisma.UserSelect

type CommentAuthorRow = Prisma.UserGetPayload<{
  select: typeof commentAuthorSelect
}>

export interface CommentAuthor {
  id: string
  username: string | null
  /** Escudo del equipo del usuario: es su "foto" en el chat y en los comentarios. */
  badgeUrl: string | null
  /** Plan vigente (`null` sin suscripción). */
  tier: SubscriptionTier | null
  /** `assetId` del color de nombre equipado, el mismo que usa el chat. */
  nameColor: string | null
}

/**
 * `assetId` de cada color de nombre equipado, por id de ítem de la tienda: los
 * usuarios guardan el id del ítem y el front dibuja el color por su `assetId`.
 */
export async function nameColorAssets(
  prisma: { storeItem: Prisma.StoreItemDelegate },
  users: { activeNameColorId: string | null }[],
): Promise<Map<string, string>> {
  const ids = [
    ...new Set(
      users.flatMap((u) => (u.activeNameColorId ? [u.activeNameColorId] : [])),
    ),
  ]
  if (ids.length === 0) return new Map()

  const items = await prisma.storeItem.findMany({
    where: { id: { in: ids } },
    select: { id: true, assetId: true },
  })
  return new Map(items.map((item) => [item.id, item.assetId]))
}

export function toCommentAuthor(
  user: CommentAuthorRow,
  nameColors: Map<string, string>,
): CommentAuthor {
  return {
    id: user.id,
    username: user.username,
    badgeUrl: user.team?.badgeUrl ?? null,
    tier: user.activeSubscriptionTier,
    nameColor: user.activeNameColorId
      ? (nameColors.get(user.activeNameColorId) ?? null)
      : null,
  }
}
