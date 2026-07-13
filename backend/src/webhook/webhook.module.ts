import { Module } from '@nestjs/common'
import { WebhookController } from './webhook.controller'
import { WebhookService } from './webhook.service'
import { SubscriptionsModule } from 'src/subscriptions'

@Module({
  controllers: [WebhookController],
  providers: [WebhookService],
  imports: [SubscriptionsModule],
})
export class WebhookModule {}
