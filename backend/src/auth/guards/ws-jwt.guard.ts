import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { WsException } from '@nestjs/websockets'
import { JwtService } from '@nestjs/jwt'
import { JwtPayload } from '../interfaces/jwt-payload.interface'
import type { SocketWithUser } from '../interfaces/jwt-payload.interface'
import { PrismaService } from 'src/prisma/prisma.service'

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<SocketWithUser>()
    const token = client.handshake.auth?.token as string
    if (!token) {
      throw new WsException('No token provided')
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token)

      // BUSCAMOS AL USUARIO EN LA DB PARA TENER EL NOMBRE
      const user = await this.prisma.users.findUnique({
        where: { id: payload.sub },
      })

      if (!user) throw new WsException('User not found')

      // Guardamos el objeto de la DB en el socket
      client.data.user = user
      return true
    } catch (error) {
      if (error instanceof WsException) throw error
      throw new WsException('Invalid or expired token')
    }
  }
}
