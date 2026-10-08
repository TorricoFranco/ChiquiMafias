import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';
import { publicUserSelect } from 'src/prisma/constants/publicUserSelect';

interface UserScore {
  id: string;
  count: number;
}

@Injectable()
export class ChatLeaderboardService {
  private readonly CHAT_LEADERBOARD_KEY = 'leaderboard:chat-messages';
  private readonly CACHED_TOP_CHATTERS_KEY = 'cache:top-chatters-enriched';

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) { }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async calculateTopChatters() {
    const rawLeaderboard = await this.redisService.redis.zrevrange(
      this.CHAT_LEADERBOARD_KEY,
      0,
      49,
      'WITHSCORES'
    );

    if (!rawLeaderboard || rawLeaderboard.length === 0) return;

    const userScores: UserScore[] = [];
    const userIds: string[] = [];

    for (let i = 0; i < rawLeaderboard.length; i += 2) {
      const id = rawLeaderboard[i];
      const count = Number(rawLeaderboard[i + 1]);
      userIds.push(id);
      userScores.push({ id, count });
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        ...publicUserSelect,
      }
    });

    const enrichedLeaderboard = userScores.map((scoreItem) => {
      const user = users.find((u) => u.id === scoreItem.id);
      return {
        id: scoreItem.id,
        messageCount: scoreItem.count,
        user: user ? {
          ...user,
          username: user.username ?? 'Usuario eliminado'
        } : null
      };
    });

    await this.redisService.redis.set(
      this.CACHED_TOP_CHATTERS_KEY,
      JSON.stringify(enrichedLeaderboard)
    );
  }

  async getTopChatters() {
    let cachedData = await this.redisService.redis.get(this.CACHED_TOP_CHATTERS_KEY);

    if (!cachedData) {
      await this.calculateTopChatters();
      cachedData = await this.redisService.redis.get(this.CACHED_TOP_CHATTERS_KEY);
    }

    return cachedData ? JSON.parse(cachedData) : [];
  }
}