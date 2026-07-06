export enum SystemRole {
  USER = 'USER',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN',
  PRESIDENT = 'PRESIDENT',
}

export const ROLE_HIERARCHY = [
  SystemRole.USER,
  SystemRole.MODERATOR,
  SystemRole.ADMIN,
  SystemRole.PRESIDENT,
]
