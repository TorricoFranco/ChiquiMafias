import { IsEnum, IsNotEmpty } from 'class-validator'
import { SubscriptionTier } from '@prisma/client'
import { ApiProperty } from '@nestjs/swagger'

export class UpgradeSubscriptionDto {
  @ApiProperty({
    enum: SubscriptionTier,
    description: 'Nuevo tier al que se quiere upgradear',
  })
  @IsEnum(SubscriptionTier, {
    message: `tier debe ser uno de: ${Object.values(SubscriptionTier).join(', ')}`,
  })
  @IsNotEmpty()
  newTier: SubscriptionTier
}
