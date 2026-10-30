import { Module } from '@nestjs/common'
import { envValidationSchema } from './config/env.validation'
import { MercadoPagoModule } from './mercado-pago/mercado-pago.module'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { APP_GUARD } from '@nestjs/core'
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard'
import { UserStatusGuard } from './auth/guards/user-status.guard'
import { BullModule } from '@nestjs/bullmq'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { EnvironmentVariables } from './config/interfaces/env.interface'
import { throttleLimit } from './config/throttle'

import { AppController } from './app.controller'
import { AppService } from './app.service'
import { ChatModule } from './chat/chat.module'
import { MatchesModule } from './matches/matches.module'
import { PrismaModule } from './prisma/prisma.module'
import { FootballModule } from './football/football.module'
import { AuthModule } from './auth/auth.module'
import { PollsModule } from './polls/polls.module'
import { RedisModule } from './redis/redis.module'
import { ScheduleModule } from '@nestjs/schedule'
import { StandingsModule } from './standings/standings.module'
import { FixtureModule } from './fixture/fixture.module'
import { CompetitionsApiModule } from './competitions/competitions-api.module'
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
import { WebhookModule } from './webhook/webhook.module'
import { CoinShopModule } from './coin-shop/coin-shop.module'
import { StatsModule } from './stats/stats.module'
import { PricingModule } from './pricing/pricing.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),

    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (
        configService: ConfigService<EnvironmentVariables, true>,
      ) => [
        {
          name: 'default',
          ttl: 60000,
          limit: throttleLimit(
            configService.get('NODE_ENV', { infer: true }),
            configService.get('THROTTLE_LIMIT', { infer: true }),
          ),
        },
      ],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
          password: configService.get('REDIS_PASSWORD'),
        },
      }),
    }),
    EventEmitterModule.forRoot(),
    ChatModule,
    UsersModule,
    MatchesModule,
    FootballModule,
    AuthModule,
    PrismaModule,
    PollsModule,
    RedisModule,
    ScheduleModule.forRoot(),
    StandingsModule,
    FixtureModule,
    CompetitionsApiModule,
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
    CoinShopModule,
    StatsModule,
    PricingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
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
