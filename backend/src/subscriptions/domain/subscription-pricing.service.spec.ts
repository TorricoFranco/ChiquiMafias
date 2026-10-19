import { Test, TestingModule } from '@nestjs/testing'
import { SubscriptionPlan, SubscriptionTier } from '@prisma/client'
import { SubscriptionPricingService } from './subscription-pricing.service'
import { PrismaService } from 'src/prisma/prisma.service'

describe('SubscriptionPricingService', () => {
  let service: SubscriptionPricingService

  const DAY_MS = 24 * 60 * 60 * 1000

  const buildPlan = (
    tier: SubscriptionTier,
    basePriceARS: number,
  ): SubscriptionPlan => ({
    id: `plan-${tier}`,
    tier,
    name: tier,
    basePriceARS,
    storeDiscountPercentage: 0,
    benefits: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  const plans = [
    buildPlan(SubscriptionTier.TIER_1, 3000),
    buildPlan(SubscriptionTier.TIER_2, 6000),
    buildPlan(SubscriptionTier.TIER_3, 9000),
  ]

  const mockPrisma = {
    subscriptionPlan: { findMany: jest.fn() },
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionPricingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()

    service = module.get<SubscriptionPricingService>(SubscriptionPricingService)

    jest.clearAllMocks()
  })

  describe('calculateUpgradeBonus', () => {
    it('Debe devolver en monedas los días que quedan del plan viejo ($3.000/mes = 200 monedas por día)', () => {
      const endsAt = new Date(Date.now() + 10 * DAY_MS - 60_000)

      const bonus = service.calculateUpgradeBonus(endsAt, 3000)

      expect(bonus).toEqual({
        daysRemaining: 10,
        coinsPerDay: 200,
        bonusCoins: 2000,
      })
    })

    it('No debe dar bono si el plan viejo ya venció', () => {
      const bonus = service.calculateUpgradeBonus(
        new Date(Date.now() - DAY_MS),
        3000,
      )

      expect(bonus.daysRemaining).toBe(0)
      expect(bonus.bonusCoins).toBe(0)
    })
  })

  describe('getPlans', () => {
    it('Debe armar upgradeRules a partir del precio del plan de origen, con la forma TIER_X_TO_TIER_Y', async () => {
      mockPrisma.subscriptionPlan.findMany.mockResolvedValue(plans)

      const result = await service.getPlans(null)

      expect(result).toHaveLength(3)
      for (const plan of result) {
        expect(plan.upgradeRules).toEqual({
          TIER_1_TO_TIER_2: 200,
          TIER_1_TO_TIER_3: 200,
          TIER_2_TO_TIER_3: 400,
        })
      }
    })
  })
})
