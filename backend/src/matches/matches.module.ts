import { Module } from '@nestjs/common'
import { MatchesController } from './matches.controller'
import { TestEventsController } from './testEvents.controller'
import { MatchesService } from './matches.service'
import { MatchesGateway } from './matches.gateway'
import { AuthModule } from 'src/auth/auth.module'
import { ApiFootballModule } from 'src/api-football/api-football.module'
import { ApiFootballHttp } from 'src/api-football/http/api-football.http'
import { ChatModule } from 'src/chat/chat.module'

@Module({
  controllers: [MatchesController, TestEventsController],
  providers: [MatchesService, MatchesGateway, ApiFootballHttp],
  imports: [AuthModule, ApiFootballModule, ChatModule],
})
export class MatchesModule { }
