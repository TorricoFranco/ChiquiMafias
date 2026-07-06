import { SubscriptionTier as PrismaSubscriptionTier } from '@prisma/client'

export type SubscriptionTier = PrismaSubscriptionTier | null

export const TIER_HIERARCHY: SubscriptionTier[] = [
  null, // Hincha común / Free
  PrismaSubscriptionTier.TIER_1,
  PrismaSubscriptionTier.TIER_2,
  PrismaSubscriptionTier.TIER_3,
]
