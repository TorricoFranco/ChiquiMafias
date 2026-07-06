import { Injectable } from '@nestjs/common'
import { RedisService } from 'src/redis/redis.service'
import { WsException } from '@nestjs/websockets'

@Injectable()
export class VoteService {
  constructor(private readonly redisService: RedisService) {}

  async castVote(pollId: string, userId: string, optionId: number) {
    const cooldownKey = `limit:vote:${userId}`

    const isSpamming = await this.redisService.redis.get(cooldownKey)
    if (isSpamming) {
      console.log('Spam por parte del user:', userId)
      throw new Error('Demasiados intentos. Esperá unos segundos.')
    }
    const voterKey = `poll:${pollId}:voters`
    const resultsKey = `poll:${pollId}:results`
    const detailKey = `poll:${pollId}:details`

    const hasVoted = await this.redisService.redis.sismember(voterKey, userId)

    if (hasVoted) {
      throw new WsException({
        status: 'error',
        code: 'ALREADY_VOTED',
        message: 'Ya votaste en esta encuesta',
      })
    }

    await this.redisService.redis.set(cooldownKey, '1', 'EX', 2)

    await this.redisService.redis
      .multi()
      .hincrby(resultsKey, optionId.toString(), 1)
      .sadd(voterKey, userId)
      .hset(detailKey, userId, optionId.toString())
      .exec()

    return this.redisService.redis.hgetall(resultsKey)
  }
}
