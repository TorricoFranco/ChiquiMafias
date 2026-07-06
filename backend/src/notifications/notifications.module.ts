import { Module } from '@nestjs/common'
import { NotificationsController } from './notifications.controller'
import { NotificationsService } from './notifications.service'
import { NotificationsListener } from './notifications.listener'
import { ChatModule } from 'src/chat/chat.module'

@Module({
  imports: [ChatModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsListener],
  exports: [NotificationsService],
})
export class NotificationsModule { }
