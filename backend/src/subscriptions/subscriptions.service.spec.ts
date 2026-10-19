import { Test, TestingModule } from '@nestjs/testing'
import { SubscriptionsService } from './subscriptions.service'
import { PrismaService } from '../prisma/prisma.service'
import { SubscriptionPricingService } from './domain/subscription-pricing.service'
import { NotFoundException } from '@nestjs/common'
import { SubscriptionTier, SubscriptionStatus } from '@prisma/client'

describe('SubscriptionsService (Unit Tests)', () => {
  let service: SubscriptionsService
  let prisma: PrismaService

  const mockPrismaService = {
    subscriptionPlan: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    userSubscription: {
      findFirst: jest.fn(),
    },
  }

  const mockSubscriptionPricingService = {
    calculateCurrentPrice: jest.fn(),
    getPlans: jest.fn(),
    getTierValue: jest.fn(),
    calculateUpgradeBonus: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: SubscriptionPricingService,
          useValue: mockSubscriptionPricingService,
        },
      ],
    }).compile()

    service = module.get<SubscriptionsService>(SubscriptionsService)
    prisma = module.get<PrismaService>(PrismaService)

    jest.clearAllMocks()
  })

  describe('updatePlan', () => {
    const planId = 'plan-123'
    const dto = { basePriceARS: 5000, storeDiscountPercentage: 10 }

    it('✅ Success: Debe actualizar el plan por id con los campos del DTO y retornarlo', async () => {
      const existingPlan = {
        id: planId,
        tier: SubscriptionTier.TIER_2,
        basePriceARS: 3000,
        name: 'Plan Intermedio',
      }
      const expectedPlan = { ...existingPlan, ...dto }

      mockPrismaService.subscriptionPlan.findUnique.mockResolvedValue(
        existingPlan,
      )
      mockPrismaService.subscriptionPlan.update.mockResolvedValue(expectedPlan)

      const result = await service.updatePlan(planId, dto)

      expect(
        mockPrismaService.subscriptionPlan.findUnique,
      ).toHaveBeenCalledWith({
        where: { id: planId },
      })
      expect(mockPrismaService.subscriptionPlan.update).toHaveBeenCalledWith({
        where: { id: planId },
        data: dto,
      })
      expect(result).toEqual(expectedPlan)
    })

    it('❌ Fail: Debe lanzar NotFoundException si el plan no existe, sin actualizar', async () => {
      mockPrismaService.subscriptionPlan.findUnique.mockResolvedValue(null)

      await expect(service.updatePlan(planId, dto)).rejects.toThrow(
        NotFoundException,
      )
      expect(mockPrismaService.subscriptionPlan.update).not.toHaveBeenCalled()
    })
  })

  describe('getCurrentSubscription', () => {
    const mockUserId = 'user-456'

    it('✅ Estado Activo: Debe retornar la suscripción si está ACTIVE o CANCELLATION_PENDING', async () => {
      const mockUser = { activeSubscriptionTier: SubscriptionTier.TIER_3 }
      const activeSub = {
        id: 'sub-1',
        userId: mockUserId,
        status: SubscriptionStatus.ACTIVE,
        tier: SubscriptionTier.TIER_3,
        startsAt: new Date(),
        endsAt: new Date(),
        autoRenew: true,
      }

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser)
      mockPrismaService.userSubscription.findFirst.mockResolvedValue(activeSub)

      const result = await service.getCurrentSubscription(mockUserId)

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUserId },
        select: { activeSubscriptionTier: true },
      })
      expect(result).toEqual({
        currentActualTier: SubscriptionTier.TIER_3,
        id: activeSub.id,
        tier: activeSub.tier,
        status: activeSub.status,
        startsAt: activeSub.startsAt,
        endsAt: activeSub.endsAt,
        autoRenew: activeSub.autoRenew,
        mpPreapprovalId: undefined,
        mpExternalRef: undefined,
      })
    })

    it('✅ Estado Expirado: Debe retornar la suscripción vieja si no hay ninguna activa', async () => {
      const mockUser = { activeSubscriptionTier: null }
      const expiredSub = {
        id: 'sub-old',
        userId: mockUserId,
        status: SubscriptionStatus.EXPIRED,
        tier: SubscriptionTier.TIER_1,
        startsAt: new Date(),
        endsAt: new Date(),
        autoRenew: false,
      }

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser)
      mockPrismaService.userSubscription.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(expiredSub)

      const result = await service.getCurrentSubscription(mockUserId)

      expect(result.status).toBe(SubscriptionStatus.EXPIRED)
      expect(result.currentActualTier).toBeNull()
    })

    it('✅ Sin Estado: Debe retornar un objeto con campos en null si el usuario no tiene historial', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null)
      mockPrismaService.userSubscription.findFirst.mockResolvedValue(null)

      const result = await service.getCurrentSubscription(mockUserId)

      expect(result).toEqual({
        currentActualTier: null,
        id: null,
        tier: null,
        status: null,
        startsAt: null,
        endsAt: null,
        autoRenew: null,
      })
    })
  })
})
