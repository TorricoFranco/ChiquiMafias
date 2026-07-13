import { Module } from '@nestjs/common'
import { MercadoPagoService } from './mercado-pago.service'
import { HttpModule } from '@nestjs/axios'

@Module({
  imports: [HttpModule],
  providers: [MercadoPagoService],
  exports: [MercadoPagoService],
})
export class MercadoPagoModule { }
