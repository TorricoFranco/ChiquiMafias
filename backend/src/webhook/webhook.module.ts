import { Module } from '@nestjs/common'
import { WebhookController } from './webhook.controller'
import { WebhookService } from './webhook.service'
import { SubscriptionsModule } from 'src/subscriptions'
import { WalletModule } from 'src/wallet/wallet.module'
import { CoinShopModule } from 'src/coin-shop/coin-shop.module'
import { MercadoPagoModule } from 'src/mercado-pago/mercado-pago.module'

@Module({
  controllers: [WebhookController],
  providers: [WebhookService],
  imports: [
    SubscriptionsModule,
    WalletModule,
    CoinShopModule,
    MercadoPagoModule,
  ],
})
export class WebhookModule {}
