import { Module } from '@nestjs/common'
import { PollsService } from './polls.service'
import { VoteService } from './vote.service'
import { PollsController } from './polls.controller'
import { TasksService } from './task.service'
import { PollsGateway } from './polls.gateway'

import { AuthModule } from 'src/auth/auth.module'

@Module({
  providers: [PollsService, VoteService, TasksService, PollsGateway],
  controllers: [PollsController],
  imports: [AuthModule],
})
export class PollsModule {}
