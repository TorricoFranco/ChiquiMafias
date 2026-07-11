import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard'
import { UserStatusGuard } from './auth/guards/user-status.guard'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { ConfigModule } from '@nestjs/config'
import { ChatModule } from './chat/chat.module'
import { MatchesModule } from './matches/matches.module'
import { PrismaModule } from './prisma/prisma.module'
import { ApiFootballModule } from './api-football/api-football.module'
import { AuthModule } from './auth/auth.module'
import { PollsModule } from './polls/polls.module'
import { RedisModule } from './redis/redis.module'
import { ScheduleModule } from '@nestjs/schedule'
import { StandingsModule } from './standings/standings.module'
import { FixtureModule } from './fixture/fixture.module'
import { UsersModule } from './users/users.module'
import { TeamsModule } from './teams/teams.module'
import { WalletModule } from './wallet/wallet.module'
import { BetsModule } from './bets/bets.module'
import { StoreModule } from './store/store.module'
import { InventoryModule } from './inventory/inventory.module'
import { NotificationsModule } from './notifications/notifications.module'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { SubscriptionsModule } from './subscriptions/subscriptions.module'
import { StreaksModule } from './streaks/streaks.module'
import { SupportModule } from './support/support.module'
import { DiscordModule } from './discord/discord.module'
import { CloudinaryModule } from './cloudinary/cloudinary.module'
import { EmailModule } from './email/email.module'
import { envValidationSchema } from './config/env.validation'
import { MercadoPagoModule } from './mercado-pago/mercado-pago.module';
import { WebhookModule } from './webhook/webhook.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    EventEmitterModule.forRoot(),
    ChatModule,
    UsersModule,
    MatchesModule,
    ApiFootballModule,
    AuthModule,
    PrismaModule,
    PollsModule,
    RedisModule,
    ScheduleModule.forRoot(),
    StandingsModule,
    FixtureModule,
    TeamsModule,
    WalletModule,
    BetsModule,
    StoreModule,
    InventoryModule,
    NotificationsModule,
    SubscriptionsModule,
    StreaksModule,
    SupportModule,
    DiscordModule,
    CloudinaryModule,
    EmailModule,
    MercadoPagoModule,
    WebhookModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: UserStatusGuard,
    },
  ],
})
export class AppModule {}
