import { Module } from '@nestjs/common'
import { CoinShopService } from './coin-shop.service'
import { CoinShopController } from './coin-shop.controller'
import { MercadoPagoModule } from '../mercado-pago/mercado-pago.module'
import { WalletModule } from '../wallet/wallet.module'

@Module({
  imports: [MercadoPagoModule, WalletModule],
  controllers: [CoinShopController],
  providers: [CoinShopService],
  exports: [CoinShopService],
})
export class CoinShopModule {}
