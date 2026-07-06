import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { WsException } from '@nestjs/websockets'

@Injectable()
export class WsJwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient()
    if (!client.data?.user) {
      throw new WsException('No autorizado en la tribuna')
    }
    return true
  }
}
