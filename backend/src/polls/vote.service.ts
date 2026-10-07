import { Injectable, Logger } from '@nestjs/common'
import { RedisService } from 'src/redis/redis.service'
import { PrismaService } from 'src/prisma/prisma.service'
import { WsException } from '@nestjs/websockets'

@Injectable()
export class VoteService {
  private readonly logger = new Logger(VoteService.name)

  constructor(
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async castVote(pollId: string, userId: string, optionId: number) {
    const cooldownKey = `limit:vote:${userId}`

    const acquired = await this.redisService.redis.set(
      cooldownKey,
      '1',
      'EX',
      2,
      'NX',
    )

    if (!acquired) {
      this.logger.warn(`Spam por parte del user: ${userId}`)
      throw new WsException('Demasiados intentos. Esperá unos segundos.')
    }

    const voterKey = `poll:${pollId}:voters`
    const resultsKey = `poll:${pollId}:results`
    const detailKey = `poll:${pollId}:details`

    const isNew = await this.redisService.redis.sadd(voterKey, userId)

    if (isNew === 0) {
      throw new WsException({
        status: 'error',
        code: 'ALREADY_VOTED',
        message: 'Ya votaste en esta encuesta',
      })
    }

    try {
      await this.prisma.vote.create({
        data: {
          pollId,
          userId,
          optionId,
        },
      })

      await this.redisService.redis
        .multi()
        .hincrby(resultsKey, optionId.toString(), 1)
        .hset(detailKey, userId, optionId.toString())
        .exec()

      return await this.redisService.redis.hgetall(resultsKey)
    } catch (error) {
      await this.redisService.redis.srem(voterKey, userId)
      this.logger.error(`Error persistiendo voto de ${userId}:`, error.message)
      throw new WsException(
        'Ocurrió un error al procesar tu voto, intentá de nuevo.',
      )
    }
  }
}
