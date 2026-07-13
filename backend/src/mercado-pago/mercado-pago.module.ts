import { Module } from '@nestjs/common'
import { MercadoPagoService } from './mercado-pago.service'
import { HttpModule } from '@nestjs/axios'

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 0,
    }),
  ],
  providers: [MercadoPagoService],
  exports: [MercadoPagoService],
})
export class MercadoPagoModule { }
