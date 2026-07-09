// src/subscriptions/subscriptions.module.ts
import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { ChatModule } from 'src/chat/chat.module'
import { WalletModule } from 'src/wallet/wallet.module'
import { SubscriptionsCronService } from './subscriptions.cron'
import { SubscriptionsService } from './subscriptions.service'
import { SubscriptionsController } from './subscriptions.controller'

@Module({
  imports: [ChatModule, WalletModule, HttpModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionsCronService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
