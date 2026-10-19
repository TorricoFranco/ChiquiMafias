import { SubscriptionTier } from '@prisma/client'
import {
  SUBSCRIPTION_TIER_NAMES,
  getTierDisplayName,
} from './subscription.constants'

describe('SUBSCRIPTION_TIER_NAMES', () => {
  it('Debe traducir cada tier al nombre que ve el usuario', () => {
    expect(getTierDisplayName(SubscriptionTier.TIER_1)).toBe('Popular')
    expect(getTierDisplayName(SubscriptionTier.TIER_2)).toBe('Plateísta')
    expect(getTierDisplayName(SubscriptionTier.TIER_3)).toBe('Palco VIP')
  })

  it('Debe tener un nombre para cada tier del enum', () => {
    expect(Object.keys(SUBSCRIPTION_TIER_NAMES).sort()).toEqual(
      Object.values(SubscriptionTier).sort(),
    )
  })

  it('Debe devolver el tier crudo si no tiene nombre', () => {
    expect(getTierDisplayName('TIER_9' as SubscriptionTier)).toBe('TIER_9')
  })
})
