import { SystemRole } from '@prisma/client'

export { SystemRole }

export const ROLE_HIERARCHY = [
  SystemRole.USER,
  SystemRole.MODERATOR,
  SystemRole.ADMIN,
  SystemRole.PRESIDENT,
]