import { Test, TestingModule } from '@nestjs/testing'
import { StatsController } from './stats.controller'
import { StatsService } from './stats.service'
import { UserStreakService } from './statsUserStreak.service'
import { ChatLeaderboardService } from './ChatLeaderboard.service'

describe('StatsController', () => {
  let controller: StatsController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatsController],
      providers: [
        { provide: StatsService, useValue: {} },
        { provide: UserStreakService, useValue: {} },
        { provide: ChatLeaderboardService, useValue: {} },
      ],
    }).compile()

    controller = module.get<StatsController>(StatsController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
