import {
  Get,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { StreaksService } from './streaks.service'
import { GetUser } from 'src/auth/decorators/get-user.decorator'

@Controller('subscriptions/streak')
export class StreaksController {
  constructor(private readonly streaksService: StreaksService) {}

  @Post('check-in')
  @HttpCode(HttpStatus.OK)
  async checkIn(@GetUser('id') userId: string) {
    return await this.streaksService.handleAutoCheckIn(userId)
  }

  @Post('claim')
  @HttpCode(HttpStatus.OK)
  async claimReward(
    @GetUser('id') userId: string,
    @GetUser('tier') userTier: string,
  ) {
    const tier = userTier || 'FREE'
    return await this.streaksService.claimDailyReward(userId, tier)
  }

  @Get('timeline')
  async getTimeline(
    @GetUser('id') userId: string,
    @GetUser('tier') userTier: string,
  ) {
    const tier = userTier || 'FREE'
    return await this.streaksService.getStreakTimeline(userId, tier)
  }
}
