import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { WsException } from '@nestjs/websockets'
import { JwtService } from '@nestjs/jwt'
import { JwtPayload } from './interfaces/jwt-payload.interface'
import type { SocketWithUser } from './interfaces/jwt-payload.interface'

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<SocketWithUser>()
    const token = client.handshake.auth?.token as string
    console.log(' GUARD EJECUTADO')
    if (!token) {
      throw new WsException({
        code: 'UNAUTHORIZED',
        message: 'Token inválido',
      })
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token)
      client.data.user = payload
      return true
    } catch {
      throw new WsException({
        code: 'UNAUTHORIZED',
        message: 'Token inválido',
      })
    }
  }
}
