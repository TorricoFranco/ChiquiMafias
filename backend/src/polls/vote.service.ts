import { Injectable } from '@nestjs/common'
import { RedisService } from 'src/redis/redis.service'

@Injectable()
export class VoteService {
  constructor(private readonly redisService: RedisService) {}

  // vote.service.ts
  async castVote(pollId: string, userId: string, optionId: number) {
    const voterKey = `poll:${pollId}:voters`
    const resultsKey = `poll:${pollId}:results`
    const detailKey = `poll:${pollId}:details`

    const hasVoted = await this.redisService.redis.sismember(voterKey, userId)
    if (hasVoted) throw new Error('Ya votaste')

    await this.redisService.redis
      .multi()
      .hincrby(resultsKey, optionId.toString(), 1)
      .sadd(voterKey, userId)
      .hset(detailKey, userId, optionId.toString()) // Guardamos la relación
      .exec()

    return this.redisService.redis.hgetall(resultsKey)
  }
}
