import { Injectable } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from 'src/prisma/prisma.service'
import { RedisService } from 'src/redis/redis.service'
import { publicUserSelect } from 'src/prisma/constants/publicUserSelect'

@Injectable()
export class UserStreakService {
  private readonly TOP_STREAKS_CACHE_KEY = 'leaderboard:active-streaks'

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async calculateTopActiveStreaks() {
    const activeDateThreshold = new Date()
    activeDateThreshold.setDate(activeDateThreshold.getDate() - 2)

    const topStreaks = await this.prisma.user.findMany({
      where: {
        lastCheckIn: { gte: activeDateThreshold },
        currentStreak: { gt: 0 },
      },
      orderBy: { currentStreak: 'desc' },
      take: 10,
      select: {
        ...publicUserSelect,
        currentStreak: true,
      },
    })

    await this.redisService.redis.set(
      this.TOP_STREAKS_CACHE_KEY,
      JSON.stringify(topStreaks),
    )
  }

  async getTopActiveStreaks() {
    const rawData = await this.redisService.redis.get(
      this.TOP_STREAKS_CACHE_KEY,
    )

    if (!rawData) {
      await this.calculateTopActiveStreaks()
      const freshData = await this.redisService.redis.get(
        this.TOP_STREAKS_CACHE_KEY,
      )
      return freshData ? JSON.parse(freshData) : []
    }

    return JSON.parse(rawData)
  }
}
