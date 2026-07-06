import { SetMetadata } from '@nestjs/common'
import { SubscriptionTier } from '../enums/tiers.enum'

export const TIERS_KEY = 'tiers'
export const RequireTier = (minTier: SubscriptionTier) => SetMetadata(TIERS_KEY, minTier)
