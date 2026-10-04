import { Controller, Get, Query, Param } from '@nestjs/common';
import { StatsService } from './stats.service';
import { UserStreakService } from './statsUserStreak.service';
import { ChatLeaderboardService } from './ChatLeaderboard.service';
import { Public } from 'src/auth/decorators/auth.decorator';
import { GetUser } from 'src/auth/decorators/get-user.decorator';

@Controller('stats')
export class StatsController {
    constructor(
        private readonly statsService: StatsService,
        private readonly userStreakService: UserStreakService,
        private readonly chatLeaderboardService: ChatLeaderboardService,
    ) { }

    @Public()
    @Get('top-earners')
    getTopEarners(@Query('limit') limit?: string) {
        return this.statsService.getTopEarners(limit ? Number(limit) : 10);
    }

    @Public()
    @Get('top-streaks')
    getTopStreaks(@Query('limit') limit?: string) {
        return this.statsService.getTopStreaks(limit ? Number(limit) : 10);
    }

    @Public()
    @Get('highest-multipliers')
    getHighestMultipliers(@Query('limit') limit?: string) {
        return this.statsService.getHighestMultipliers(limit ? Number(limit) : 10);
    }

    @Get('me')
    getMyStats(@GetUser('id') userId: string) {
        return this.statsService.getUserStats(userId);
    }

    @Public()
    @Get('most-active')
    getMostActive(@Query('limit') limit?: string) {
        return this.statsService.getMostActive(limit ? Number(limit) : 10);
    }

    @Public()
    @Get('top-stakers')
    getTopStakers(@Query('limit') limit?: string) {
        return this.statsService.getTopStakers(limit ? Number(limit) : 10);
    }

    @Public()
    @Get('global')
    getGlobalStats() {
        return this.statsService.getGlobalPlatformStats();
    }

    @Public()
    @Get('top-active')
    getTopActiveStreaks() {
        return this.userStreakService.getTopActiveStreaks();
    }

    @Public()
    @Get('top-chatters')
    getTopChatters() {
        return this.chatLeaderboardService.getTopChatters();
    }
}