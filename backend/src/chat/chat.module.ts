import { Module } from '@nestjs/common'
import { ChatService } from './chat.service'
import { ChatGateway } from './chat.gateway'
import { AuthModule } from 'src/auth/auth.module'
import { WsJwtGuard } from 'src/auth/ws-jwt.guard'

@Module({
  imports: [AuthModule],
  providers: [ChatGateway, ChatService, WsJwtGuard],
})
export class ChatModule {}
