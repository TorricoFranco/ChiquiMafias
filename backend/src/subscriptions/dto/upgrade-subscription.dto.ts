import { IsEnum, IsNotEmpty } from 'class-validator'
import { SubscriptionTier } from '@prisma/client'

export class UpgradeSubscriptionDto {
    @IsEnum(SubscriptionTier, {
        message: `tier debe ser uno de: ${Object.values(SubscriptionTier).join(', ')}`,
    })
    @IsNotEmpty()
    newTier: SubscriptionTier
}
