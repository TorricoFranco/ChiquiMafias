import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { ConfigModule } from '@nestjs/config'
import { AppConfiguration } from './config/app.config'
import { ChatModule } from './chat/chat.module'
import { UsersModule } from './users/users.module'
import { TeamsModule } from './teams/teams.module'
import { MatchesModule } from './matches/matches.module'
import { StatsModule } from './stats/stats.module'
import { TableModule } from './table/table.module'
import { PrismaModule } from './prisma/prisma.module'
import { ApiFootballModule } from './api-football/api-football.module'
import { AuthModule } from './auth/auth.module'
import { PollsModule } from './polls/polls.module'
import { RedisModule } from './redis/redis.module'
import { ScheduleModule } from '@nestjs/schedule'

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [AppConfiguration],
    }),
    ChatModule,
    UsersModule,
    TeamsModule,
    MatchesModule,
    StatsModule,
    TableModule,
    ApiFootballModule,
    AuthModule,
    PrismaModule,
    PollsModule,
    RedisModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
