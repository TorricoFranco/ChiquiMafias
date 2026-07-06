import { Module } from '@nestjs/common'
import { UsersController } from './users.controller'
import { ModerationController } from './moderation.controller'
import { UsersService } from './users.service'
import { ChatModule } from 'src/chat/chat.module'

@Module({
  controllers: [UsersController, ModerationController],
  providers: [UsersService],
  imports: [ChatModule],
})
export class UsersModule { }
