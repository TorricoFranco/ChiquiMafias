import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  Logger,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ALLOW_BANNED_KEY } from '../decorators/allow-banned.decorator'
import { RedisService } from 'src/redis/redis.service'
import { PrismaService } from 'src/prisma/prisma.service'
import { bannedUserKey } from 'src/users/ban-status'
import { ActiveUser } from '../interfaces/active-user.interface'

// Con Redis caído, ioredis encola el comando ~11 s antes de fallar: no se lo espera.
const REDIS_TIMEOUT_MS = 200

@Injectable()
export class UserStatusGuard implements CanActivate {
  private readonly logger = new Logger(UserStatusGuard.name)

  constructor(
    private reflector: Reflector,
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user?: ActiveUser }>()
    const user = request.user

    if (!user) return true

    // El claim del access token puede estar desactualizado hasta que vence (ban o
    // unban recientes). Se pisa en request.user para que @GetUser('isBanned') vea
    // el mismo estado que este guard.
    user.isBanned = await this.isBanned(user)

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

  /**
   * - La key `user:banned:<id>` y el token coinciden → eso (el caso normal, sin ir a la DB).
   * - No coinciden → decide la DB: es un ban o unban de los últimos minutos (el token se
   *   renueva cada 15 min) o una key que quedó mal porque falló el SET/DEL. Si la DB tampoco
   *   responde, se bloquea.
   * - Redis no disponible → el claim del token, como antes de existir la key.
   */
  private async isBanned(user: ActiveUser): Promise<boolean> {
    const tokenClaim = user.isBanned === true
    const redis = this.redisService.redis

    if (redis.status !== 'ready') return tokenClaim

    let flag: string | null
    try {
      flag = await this.withTimeout(redis.get(bannedUserKey(user.id)))
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      this.logger.warn(
        `No se pudo leer el estado de ban del usuario ${user.id} en Redis; se usa el del token: ${reason}`,
      )
      return tokenClaim
    }

    const keyClaim = flag === 'true'
    if (keyClaim === tokenClaim) return keyClaim

    try {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { status: true },
      })
      return dbUser?.status === 'BANNED'
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      this.logger.warn(
        `No se pudo confirmar en la DB el ban del usuario ${user.id}; se mantiene el del token: ${reason}`,
      )
      return true
    }
  }

  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    let timer: NodeJS.Timeout | undefined
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Redis no respondió en ${REDIS_TIMEOUT_MS} ms`)),
        REDIS_TIMEOUT_MS,
      )
    })
    try {
      return await Promise.race([promise, timeout])
    } finally {
      clearTimeout(timer)
    }
  }
}
