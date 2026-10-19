// Estado de ban en Redis: es la fuente que lee UserStatusGuard en cada request.
// UsersService.applyBan / applyUnban escriben y borran esta misma key (`user:banned:<id>`).
export const BANNED_USER_KEY_PREFIX = 'user:banned:'

export const bannedUserKey = (userId: string) =>
  `${BANNED_USER_KEY_PREFIX}${userId}`
