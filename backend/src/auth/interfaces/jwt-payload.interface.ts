import { Socket } from 'socket.io'
import { Users } from '@prisma/client'

export interface JwtPayload {
  sub: string
  email?: string
  isFirstLogin: boolean
}

export interface SocketWithUser extends Socket {
  data: {
    user: Users
  }
}
