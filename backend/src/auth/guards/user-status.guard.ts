import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ALLOW_BANNED_KEY } from '../decorators/allow-banned.decorator'

@Injectable()
export class UserStatusGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const user = request.user

    if (!user) return true

    if (user.isBanned) {
      const allowBanned = this.reflector.getAllAndOverride<boolean>(
        ALLOW_BANNED_KEY,
        [context.getHandler(), context.getClass()],
      )

      if (allowBanned) return true

      throw new ForbiddenException({
        statusCode: 403,
        message: 'Tu cuenta se encuentra suspendida por irregularidades.',
        code: 'USER_BANNED',
      })
    }
    return true
  }
}
