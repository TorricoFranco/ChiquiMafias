import { Module } from '@nestjs/common'
import { MatchesController } from './matches.controller'
import { TestEventsController } from './testEvents.controller'
import { MatchesService } from './matches.service'
import { MatchesGateway } from './matches.gateway'
import { StandingsModule } from 'src/standings/standings.module'
import { AuthModule } from 'src/auth/auth.module'
import { FootballModule } from 'src/football/football.module'
import { ChatModule } from 'src/chat/chat.module'

@Module({
  controllers: [MatchesController, TestEventsController],
  providers: [MatchesService, MatchesGateway],
  imports: [AuthModule, FootballModule, ChatModule, StandingsModule],
})
export class MatchesModule {}
