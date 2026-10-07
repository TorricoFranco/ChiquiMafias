import { Test, TestingModule } from '@nestjs/testing'
import { SubscriptionCheckoutService } from './subscription-checkout.service'
import { PrismaService } from '../prisma/prisma.service'
import { MercadoPagoService } from 'src/mercado-pago/mercado-pago.service'
import { RedisService } from '../redis/redis.service'
import { SubscriptionPricingService } from './domain/subscription-pricing.service'
import { ConfigService } from '@nestjs/config'
import { BadRequestException, ConflictException } from '@nestjs/common'
import { SubscriptionTier, SubscriptionStatus } from '@prisma/client'

describe('SubscriptionCheckoutService (Unit Tests)', () => {
  let service: SubscriptionCheckoutService
  let prisma: PrismaService
  let mercadoPagoService: MercadoPagoService
  let redisService: RedisService
  let pricingService: SubscriptionPricingService

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    subscriptionPlan: {
      findUnique: jest.fn(),
    },
    userSubscription: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    processedPayment: {
      findUnique: jest.fn(),
    },
  }

  const mockMercadoPagoService = {
    createPreapproval: jest.fn(),
    cancelPreapprovalInMercadoPago: jest.fn(),
    getPaymentDetails: jest.fn(),
  }

  const mockRedisService = {
    redis: {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
    },
  }

  const mockSubscriptionPricingService = {
    calculateCurrentPrice: jest.fn(),
    getTierValue: jest.fn(),
    calculateUpgradeBonus: jest.fn(),
  }

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'FRONTEND_URL') return 'http://localhost:3000'
      if (key === 'FRONTEND_SUCCESS_URL') return 'success'
      return 'mock-value'
    }),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionCheckoutService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MercadoPagoService, useValue: mockMercadoPagoService },
        { provide: RedisService, useValue: mockRedisService },
        {
          provide: SubscriptionPricingService,
          useValue: mockSubscriptionPricingService,
        },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile()

    service = module.get<SubscriptionCheckoutService>(
      SubscriptionCheckoutService,
    )
    prisma = module.get<PrismaService>(PrismaService)
    mercadoPagoService = module.get<MercadoPagoService>(MercadoPagoService)
    redisService = module.get<RedisService>(RedisService)
    pricingService = module.get<SubscriptionPricingService>(
      SubscriptionPricingService,
    )

    jest.clearAllMocks()
  })

  describe('startCheckout', () => {
    const userId = 'user-123'
    const mockUser = { id: userId, email: 'franco@test.com' }
    const mockPlan = {
      tier: SubscriptionTier.TIER_2,
      isActive: true,
      basePriceARS: 3500,
    }

    beforeEach(() => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser)
      mockPrismaService.subscriptionPlan.findUnique.mockResolvedValue(mockPlan)
      mockSubscriptionPricingService.calculateCurrentPrice.mockReturnValue({
        discountedPriceARS: 3500,
      })
    })

    it('❌ Fail - Doble Sub: Si compra sub nueva (isUpgrade=false) pero ya tiene ACTIVE, lanza ConflictException', async () => {
      mockPrismaService.userSubscription.findFirst.mockResolvedValue({
        id: 'sub-activa',
        status: SubscriptionStatus.ACTIVE,
      })

      await expect(
        service.startCheckout(userId, SubscriptionTier.TIER_2, false),
      ).rejects.toThrow(ConflictException)

      expect(mockPrismaService.userSubscription.findFirst).toHaveBeenCalledWith(
        {
          where: { userId, status: SubscriptionStatus.ACTIVE },
        },
      )
    })

    it('❌ Fail - Upgrade fantasma: Si intenta upgrade (isUpgrade=true) pero NO tiene sub activa, lanza ConflictException', async () => {
      mockPrismaService.userSubscription.findFirst.mockResolvedValue(null)

      await expect(
        service.startCheckout(userId, SubscriptionTier.TIER_3, true),
      ).rejects.toThrow(ConflictException)
    })

    it('❌ Fail - Upgrade al mismo plan: Si intenta upgrade al mismo tier que ya posee, lanza ConflictException', async () => {
      mockPrismaService.userSubscription.findFirst.mockResolvedValue({
        id: 'sub-actual',
        tier: SubscriptionTier.TIER_2,
        status: SubscriptionStatus.ACTIVE,
      })

      await expect(
        service.startCheckout(userId, SubscriptionTier.TIER_2, true),
      ).rejects.toThrow(ConflictException)
    })

    it('✅ Success: Si todo está ok, genera el Preapproval en MP, impacta PENDING en DB y guarda en Redis', async () => {
      mockPrismaService.userSubscription.findFirst.mockResolvedValue(null)
      mockMercadoPagoService.createPreapproval.mockResolvedValue({
        id: 'mp-preapp-999',
        init_point: 'https://mercadopago.com/checkout/init',
      })
      mockPrismaService.userSubscription.create.mockResolvedValue({
        id: 'local-sub-777',
      })

      const result = await service.startCheckout(
        userId,
        SubscriptionTier.TIER_2,
        false,
      )

      expect(mockMercadoPagoService.createPreapproval).toHaveBeenCalled()
      expect(mockPrismaService.userSubscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            tier: SubscriptionTier.TIER_2,
            status: SubscriptionStatus.PENDING,
            mpPreapprovalId: 'mp-preapp-999',
          }),
        }),
      )
      expect(mockRedisService.redis.set).toHaveBeenCalledWith(
        expect.stringContaining('subscription:checkout:'),
        'local-sub-777',
        'EX',
        3600,
      )
      expect(result).toHaveProperty(
        'init_point',
        'https://mercadopago.com/checkout/init',
      )
    })
  })

  describe('upgradeSubscription', () => {
    const userId = 'user-123'

    it('❌ Fail - Downgrade: Si el valor del nuevo tier es menor o igual al actual, lanza BadRequestException', async () => {
      const activeSub = {
        id: 'sub-actual',
        tier: SubscriptionTier.TIER_3,
        endsAt: new Date(),
      }
      mockPrismaService.userSubscription.findFirst.mockResolvedValue(activeSub)

      mockSubscriptionPricingService.getTierValue.mockImplementation((tier) => {
        if (tier === SubscriptionTier.TIER_3) return 3
        if (tier === SubscriptionTier.TIER_2) return 2
        return 1
      })

      await expect(
        service.upgradeSubscription(userId, SubscriptionTier.TIER_2),
      ).rejects.toThrow(BadRequestException)
    })

    it('✅ Success: Si el tier es superior, ejecuta startCheckout y guarda el puente en Redis', async () => {
      const activeSub = {
        id: 'sub-actual',
        tier: SubscriptionTier.TIER_1,
        endsAt: new Date(),
      }
      mockPrismaService.userSubscription.findFirst.mockResolvedValue(activeSub)

      mockSubscriptionPricingService.getTierValue.mockImplementation((tier) => {
        if (tier === SubscriptionTier.TIER_3) return 3
        return 1
      })
      mockSubscriptionPricingService.calculateUpgradeBonus.mockReturnValue({
        bonusCoins: 150,
      })

      const startCheckoutSpy = jest
        .spyOn(service, 'startCheckout')
        .mockResolvedValue({
          init_point: 'https://mp.com/upgrade',
          external_reference: 'ref-upgrade-123',
          subscription_id: 'new-sub-id',
          tier: SubscriptionTier.TIER_3,
        })

      const result = await service.upgradeSubscription(
        userId,
        SubscriptionTier.TIER_3,
      )

      expect(startCheckoutSpy).toHaveBeenCalledWith(
        userId,
        SubscriptionTier.TIER_3,
        true,
      )
      expect(mockRedisService.redis.set).toHaveBeenCalledWith(
        'subscription:upgrade:ref-upgrade-123',
        'sub-actual',
        'EX',
        3600,
      )
      expect(result.bonus_coins).toBe(150)
      expect(result.init_point).toBe('https://mp.com/upgrade')
    })
  })

  describe('cancelSubscription', () => {
    const userId = 'user-123'
    const activeSub = {
      id: 'sub-active',
      mpPreapprovalId: 'mp-id-555',
      endsAt: new Date(),
    }

    it('✅ Success: Pausa el débito en Mercado Pago y pasa la DB local a CANCELLATION_PENDING', async () => {
      mockPrismaService.userSubscription.findFirst.mockResolvedValue(activeSub)
      mockPrismaService.userSubscription.update.mockResolvedValue({
        ...activeSub,
        status: SubscriptionStatus.CANCELLATION_PENDING,
      })

      const result = await service.cancelSubscription(userId)

      expect(
        mockMercadoPagoService.cancelPreapprovalInMercadoPago,
      ).toHaveBeenCalledWith('mp-id-555')
      expect(mockPrismaService.userSubscription.update).toHaveBeenCalledWith({
        where: { id: activeSub.id },
        data: {
          status: SubscriptionStatus.CANCELLATION_PENDING,
          autoRenew: false,
        },
      })
      expect(result.message).toBe('Suscripción cancelada correctamente')
    })

    it('✅ Resiliencia: Si MP responde que ya estaba cancelada, atrapa el error y actualiza la DB local igualmente', async () => {
      mockPrismaService.userSubscription.findFirst.mockResolvedValue(activeSub)

      const mpError = {
        response: {
          status: 400,
          data: { message: 'cancelled preapproval' },
        },
      }
      mockMercadoPagoService.cancelPreapprovalInMercadoPago.mockRejectedValue(
        mpError,
      )
      mockPrismaService.userSubscription.update.mockResolvedValue({
        ...activeSub,
        status: SubscriptionStatus.CANCELLATION_PENDING,
      })

      const result = await service.cancelSubscription(userId)

      expect(mockPrismaService.userSubscription.update).toHaveBeenCalled()
      expect(result.subscription.status).toBe(
        SubscriptionStatus.CANCELLATION_PENDING,
      )
    })
  })

  describe('processWebhook', () => {
    const mockPayload = {
      type: 'payment',
      action: 'payment.created',
      data: { id: 'mp-payment-111' },
    }

    const mockPaymentDetails = {
      status: 'approved',
      external_reference: 'ref-checkout-999',
    }

    const mockLocalSub = {
      id: 'sub-local-123',
      userId: 'user-123',
      tier: SubscriptionTier.TIER_2,
      mpExternalRef: 'ref-checkout-999',
    }

    let txMock: any

    beforeEach(() => {
      mockMercadoPagoService.getPaymentDetails.mockResolvedValue(
        mockPaymentDetails,
      )
      mockPrismaService.userSubscription.findFirst.mockResolvedValue(
        mockLocalSub,
      )
      mockRedisService.redis.get.mockResolvedValue(null)

      txMock = {
        processedPayment: { create: jest.fn().mockResolvedValue({}) },
        userSubscription: { update: jest.fn().mockResolvedValue(mockLocalSub) },
        user: {
          update: jest.fn().mockResolvedValue({ wallet: { id: 'wallet-123' } }),
        },
        subscriptionPlan: {
          findUnique: jest.fn().mockResolvedValue({ benefits: [] }),
        },
        coinTransaction: { create: jest.fn().mockResolvedValue({}) },
        wallet: { update: jest.fn().mockResolvedValue({}) },
      }

      ;(prisma as any).$transaction = jest
        .fn()
        .mockImplementation((callback) => callback(txMock))
    })

    it('✅ Idempotencia - Caso 1: Si ocurre un choque de unicidad (P2002) en la DB, responde con éxito sin duplicar beneficios', async () => {
      const prismaError: any = new Error('Prisma Error')
      prismaError.code = 'P2002'
      txMock.processedPayment.create.mockRejectedValue(prismaError)

      mockPrismaService.processedPayment.findUnique.mockResolvedValue(null)

      const result = await service.processWebhook(mockPayload)

      expect(result).toEqual({
        status: 'idempotent',
        message: 'Pago ya fue procesado',
      })
      expect(txMock.userSubscription.update).not.toHaveBeenCalled()
    })

    it('✅ Resiliencia - Caso 2: Si la baja de la sub vieja en MP falla en un Upgrade, el webhook termina exitosamente', async () => {
      mockRedisService.redis.get.mockResolvedValue('old-sub-id-abc')

      txMock.userSubscription.findUnique = jest.fn().mockResolvedValue({
        id: 'old-sub-id-abc',
        status: SubscriptionStatus.ACTIVE,
        mpPreapprovalId: 'mp-old-preapp-000',
        endsAt: new Date(),
      })

      mockMercadoPagoService.cancelPreapprovalInMercadoPago.mockRejectedValue(
        new Error('Mercado Pago API Timeout o Error 500'),
      )

      const result = await service.processWebhook(mockPayload)

      expect(result.status).toBe('success')
      expect(txMock.userSubscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'old-sub-id-abc' },
          data: expect.objectContaining({ status: SubscriptionStatus.EXPIRED }),
        }),
      )
    })
  })
})
