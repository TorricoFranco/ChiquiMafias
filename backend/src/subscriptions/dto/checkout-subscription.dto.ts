import { IsEnum, IsNotEmpty, IsString } from 'class-validator'
import { SubscriptionTier } from '@prisma/client'

export class CheckoutSubscriptionDto {
  @IsEnum(SubscriptionTier, {
    message: `tier debe ser uno de: ${Object.values(SubscriptionTier).join(', ')}`,
  })
  @IsNotEmpty()
  tier: SubscriptionTier
}
