import { SystemRole, SubscriptionTier } from '@prisma/client'
import { Socket } from 'socket.io'

export interface JwtPayload {
  sub: string
  email: string
  isFirstLogin: boolean
  isBanned: boolean
  role: SystemRole
  tier: SubscriptionTier | null
}
export interface RefreshTokenPayload {
  sub: string
}

export interface ActiveUser {
  id: string
  email: string
  isFirstLogin: boolean
  isBanned: boolean
  role: SystemRole
  tier: SubscriptionTier | null
}

export interface SocketWithUser extends Socket {
  data: {
    user: {
      id: string
      name: string
      username: string
      role: SystemRole
      tier: SubscriptionTier | null
      team?: {
        name: string
        badgeUrl: string | null
      } | null
    }
  }
}
