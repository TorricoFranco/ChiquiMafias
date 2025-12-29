import { Module } from '@nestjs/common'
import { PollsService } from './polls.service'
import { VoteService } from './vote.service'
import { PollsController } from './polls.controller'
import { TasksService } from './task.service'

@Module({
  providers: [PollsService, VoteService, TasksService],
  controllers: [PollsController],
})
export class PollsModule {}
