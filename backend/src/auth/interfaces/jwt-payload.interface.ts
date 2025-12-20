import { Socket } from 'socket.io'

export interface JwtPayload {
  sub: string
  email?: string
  name: string
}

export interface SocketWithUser extends Socket {
  data: {
    user: JwtPayload
  }
}
