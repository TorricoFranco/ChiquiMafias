import { Module } from '@nestjs/common'
import { StatsController } from './stats.controller'
import { StatsService } from './stats.service'
import { UserStreakService } from './statsUserStreak.service'
import { ChatLeaderboardService } from './ChatLeaderboard.service'

@Module({
  controllers: [StatsController],
  providers: [StatsService, UserStreakService, ChatLeaderboardService],
})
export class StatsModule {}
