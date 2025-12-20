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
import { PrismaService } from './prisma.service'
import { ApiFootballModule } from './api-football/api-football.module';

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
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
