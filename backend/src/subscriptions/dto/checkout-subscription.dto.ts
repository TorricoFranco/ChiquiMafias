import { IsEnum, IsNotEmpty, IsString } from 'class-validator'
import { SubscriptionTier } from '@prisma/client'
import { ApiProperty } from '@nestjs/swagger'

export class CheckoutSubscriptionDto {
  @ApiProperty({
    enum: SubscriptionTier,
    description: 'Tier de suscripción a comprar',
  })
  @IsEnum(SubscriptionTier, {
    message: `tier debe ser uno de: ${Object.values(SubscriptionTier).join(', ')}`,
  })
  @IsNotEmpty()
  tier: SubscriptionTier
}
