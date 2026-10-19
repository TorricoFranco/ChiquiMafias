import { SystemRole } from '@prisma/client'

export { SystemRole }

export const ROLE_HIERARCHY = [
  SystemRole.USER,
  SystemRole.MODERATOR,
  SystemRole.ADMIN,
  SystemRole.PRESIDENT,
]

// true si `actor` tiene un rol estrictamente superior a `target`
export const outranks = (actor: SystemRole, target: SystemRole): boolean =>
  ROLE_HIERARCHY.indexOf(actor) > ROLE_HIERARCHY.indexOf(target)
