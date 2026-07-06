import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { RedisService } from 'src/redis/redis.service'
import { ALLOW_BANNED_KEY } from '../decorators/allow-banned.decorator'

@Injectable()
export class UserStatusGuard implements CanActivate {
  constructor(
    private readonly redisService: RedisService,
    private reflector: Reflector,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const user = request.user
    const body = request.body

    if (!user) return true

    const redisKey = `user:banned:${user.id}`
    const isBanned = await this.redisService.redis.get(redisKey)

    if (isBanned === 'true') {
      const allowBanned = this.reflector.getAllAndOverride<boolean>(
        ALLOW_BANNED_KEY,
        [context.getHandler(), context.getClass()],
      )

      if (allowBanned && body?.category === 'APPEAL') {
        return true
      }

      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Tu cuenta se encuentra suspendida por irregularidades.',
        code: 'USER_BANNED',
      })
    }

    return true
  }
}
