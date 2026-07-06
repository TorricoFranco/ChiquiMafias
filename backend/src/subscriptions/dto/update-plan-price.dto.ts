import { SubscriptionTier } from '@prisma/client'
import { IsEnum, IsNumber, Min } from 'class-validator'

export class UpdatePlanPriceDto {
  @IsEnum(SubscriptionTier)
  tier: SubscriptionTier

  @IsNumber()
  @Min(20)
  basePriceARS: number
}
