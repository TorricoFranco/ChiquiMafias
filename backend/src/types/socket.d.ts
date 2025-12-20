import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface'

declare module 'socket.io' {
  interface Socket {
    data: {
      user?: JwtPayload
    }
  }
}
