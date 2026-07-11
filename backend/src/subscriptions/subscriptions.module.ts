import { Module } from '@nestjs/common'
import { ChatModule } from 'src/chat/chat.module'
import { WalletModule } from 'src/wallet/wallet.module'
import { SubscriptionsCronService } from './subscriptions.cron'
import { SubscriptionsService } from './subscriptions.service'
import { SubscriptionPricingService } from './domain/subscription-pricing.service'
import { SubscriptionsController } from './subscriptions.controller'
import { MercadoPagoModule } from 'src/mercado-pago/mercado-pago.module'
import { SubscriptionCheckoutService } from './subscription-checkout.service'

@Module({
  imports: [ChatModule, WalletModule, MercadoPagoModule],
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionsService,
    SubscriptionsCronService,
    SubscriptionPricingService,
    SubscriptionCheckoutService,
  ],
  exports: [
    SubscriptionsService,
    SubscriptionPricingService,
    SubscriptionCheckoutService,
  ],
})
export class SubscriptionsModule { }
