import { Module } from '@nestjs/common'
import { PricingController } from './pricing.controller'
import { PricingService } from './pricing.service'

// PrismaModule es @Global, así que no hace falta importarlo.
@Module({
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
