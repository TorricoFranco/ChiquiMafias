import { SubscriptionTier } from '@prisma/client'

export { SubscriptionTier }

export const TIER_HIERARCHY: (SubscriptionTier | null)[] = [
  null,
  SubscriptionTier.TIER_1,
  SubscriptionTier.TIER_2,
  SubscriptionTier.TIER_3,
]
