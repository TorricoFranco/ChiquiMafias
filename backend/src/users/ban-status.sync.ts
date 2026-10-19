import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { RedisService } from 'src/redis/redis.service'
import { BANNED_USER_KEY_PREFIX, bannedUserKey } from './ban-status'

/**
 * Al arrancar, alinea las keys `user:banned:<id>` de Redis con `User.status` de la DB.
 * UserStatusGuard confía en Redis, así que cubre a los baneados de antes de que existiera
 * la key, un Redis vaciado o un ban o unban hecho directo en la DB.
 */
@Injectable()
export class BanStatusSync implements OnApplicationBootstrap {
  private readonly logger = new Logger(BanStatusSync.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.sync()
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      this.logger.error(
        `No se pudo sincronizar el estado de ban en Redis: ${reason}`,
      )
    }
  }

  async sync() {
    const redis = this.redisService.redis

    const banned = await this.prisma.user.findMany({
      where: { status: 'BANNED' },
      select: { id: true },
    })
    const bannedIds = new Set(banned.map((user) => user.id))

    if (bannedIds.size > 0) {
      const pipeline = redis.pipeline()
      for (const id of bannedIds) pipeline.set(bannedUserKey(id), 'true')
      await pipeline.exec()
    }

    const staleIds: string[] = []
    let cursor = '0'
    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        'MATCH',
        `${BANNED_USER_KEY_PREFIX}*`,
        'COUNT',
        500,
      )
      cursor = nextCursor
      for (const key of keys) {
        const userId = key.slice(BANNED_USER_KEY_PREFIX.length)
        if (!bannedIds.has(userId)) staleIds.push(userId)
      }
    } while (cursor !== '0')

    // Se vuelve a mirar la DB justo antes de borrar: si otra instancia baneó a alguien
    // mientras se escaneaba, su key no se toca.
    const bannedMeanwhile = staleIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: staleIds }, status: 'BANNED' },
          select: { id: true },
        })
      : []
    const stillBanned = new Set(bannedMeanwhile.map((user) => user.id))
    const keysToDelete = staleIds
      .filter((id) => !stillBanned.has(id))
      .map(bannedUserKey)

    if (keysToDelete.length > 0) await redis.del(...keysToDelete)

    this.logger.log(
      `Estado de ban sincronizado en Redis: ${bannedIds.size} baneados, ${keysToDelete.length} keys viejas borradas.`,
    )
  }
}
