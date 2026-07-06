import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { WsException } from '@nestjs/websockets'
import { RedisService } from 'src/redis/redis.service'
import type { SocketWithUser } from 'src/auth/interfaces/jwt-payload.interface'

@Injectable()
export class WsTimeoutGuard implements CanActivate {
  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: SocketWithUser = context.switchToWs().getClient()
    const user = client.data?.user

    if (!user) return true

    const isTimedOut = await this.redisService.redis.exists(
      `timeout:${user.id}`,
    )

    if (isTimedOut) {
      const ttlSeconds = await this.redisService.redis.ttl(`timeout:${user.id}`)
      const minutesLeft = Math.ceil(ttlSeconds / 60)

      throw new WsException({
        code: 'USER_TIMEOUT',
        message: `Estás silenciado. Te quedan ${minutesLeft} minutos en el banco, pa. 🤫`,
      })
    }

    return true
  }
}
