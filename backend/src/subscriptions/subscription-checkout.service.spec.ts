import { Test, TestingModule } from '@nestjs/testing'
import { SubscriptionCheckoutService } from './subscription-checkout.service'
import { PrismaService } from '../prisma/prisma.service'
import { MercadoPagoService } from 'src/mercado-pago/mercado-pago.service'
import { RedisService } from '../redis/redis.service'
import { SubscriptionPricingService } from './domain/subscription-pricing.service'
import { ConfigService } from '@nestjs/config'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { BadRequestException, ConflictException } from '@nestjs/common'
import { SubscriptionTier, SubscriptionStatus } from '@prisma/client'
import { SubscriptionRewardsService } from './Subscription-rewards.service'
import { WalletService } from '../wallet/wallet.service'
import { MercadoPagoWebhookPayload } from './interfaces/mercado-pago.interface'
import { UPGRADE_LINK_TTL_SECONDS } from './constants/subscription.constants'

describe('SubscriptionCheckoutService (Unit Tests)', () => {
  let service: SubscriptionCheckoutService
  let prisma: PrismaService
  let mercadoPagoService: MercadoPagoService
  let redisService: RedisService
  let pricingService: SubscriptionPricingService

  const mockPrismaService = {
    $transaction: jest.fn(),
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
      updateMany: jest.fn(),
    },
    processedPayment: {
      findUnique: jest.fn(),
    },
  }

  const mockSubscriptionRewardsService = {
    grantRewards: jest.fn(),
  }

  const mockWalletService = {
    addCoins: jest.fn(),
    syncBalanceCache: jest.fn(),
  }

  const addCoinsCall = () =>
    mockWalletService.addCoins.mock.calls[0] as [
      Record<string, unknown>,
      unknown,
    ]

  const mockEventEmitter = {
    emit: jest.fn(),
  }

  const mockMercadoPagoService = {
    getMercadoPagoConfig: jest.fn().mockReturnValue({
      FRONTEND_SUCCESS_URL: 'http://localhost:3005/success',
      CURRENCY: 'ARS',
    }),
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
        {
          provide: SubscriptionRewardsService,
          useValue: mockSubscriptionRewardsService,
        },
        { provide: WalletService, useValue: mockWalletService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
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

    it('✅ Success: Si el tier es superior, ejecuta startCheckout, estima el bono con el precio del plan actual y guarda el puente en Redis', async () => {
      const activeSub = {
        id: 'sub-actual',
        tier: SubscriptionTier.TIER_1,
        endsAt: new Date(),
      }
      const upgradeRef = '6f1c2d3e-0000-4000-8000-000000000123'
      mockPrismaService.userSubscription.findFirst.mockResolvedValue(activeSub)
      mockPrismaService.subscriptionPlan.findUnique.mockResolvedValue({
        tier: SubscriptionTier.TIER_1,
        basePriceARS: 3000,
      })

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
          external_reference: upgradeRef,
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
      expect(
        mockSubscriptionPricingService.calculateUpgradeBonus,
      ).toHaveBeenCalledWith(activeSub.endsAt, 3000)
      expect(mockRedisService.redis.set).toHaveBeenCalledWith(
        `subscription:upgrade:${upgradeRef}`,
        'sub-actual',
        'EX',
        UPGRADE_LINK_TTL_SECONDS,
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
    const buildPayload = (type: string): MercadoPagoWebhookPayload => ({
      action: 'created',
      application_id: 1,
      date: '2026-10-07T12:00:00Z',
      entity: 'authorized_payment',
      id: 1,
      type,
      version: 1,
      data: { id: 'mp-payment-111' },
    })
    const mockPayload = buildPayload('subscription_authorized_payment')

    const mockLocalSub = {
      id: 'sub-local-123',
      userId: 'user-123',
      tier: SubscriptionTier.TIER_2,
      status: SubscriptionStatus.PENDING,
      mpExternalRef: 'ref-checkout-999',
      mpPreapprovalId: 'mp-preapp-local',
    }

    const oldSub = {
      id: 'old-sub-id-abc',
      tier: SubscriptionTier.TIER_1,
      status: SubscriptionStatus.ACTIVE,
      mpPreapprovalId: 'mp-old-preapp-000',
      autoRenew: true,
      endsAt: new Date(),
    }

    const createTxMock = () => ({
      processedPayment: { create: jest.fn().mockResolvedValue({}) },
      userSubscription: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest
          .fn()
          .mockResolvedValue({ ...mockLocalSub, status: 'ACTIVE' }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      user: { update: jest.fn().mockResolvedValue({}) },
      wallet: { upsert: jest.fn().mockResolvedValue({ id: 'wallet-123' }) },
      subscriptionPlan: {
        findUnique: jest.fn().mockResolvedValue({ basePriceARS: 3000 }),
      },
      coinTransaction: { create: jest.fn().mockResolvedValue({}) },
    })

    let txMock: ReturnType<typeof createTxMock>

    beforeEach(() => {
      mockPrismaService.processedPayment.findUnique.mockResolvedValue(null)
      mockMercadoPagoService.getPaymentDetails.mockResolvedValue({
        status: 'processed',
        external_reference: 'ref-checkout-999',
      })
      mockPrismaService.userSubscription.findFirst.mockResolvedValue(
        mockLocalSub,
      )
      mockRedisService.redis.get.mockResolvedValue(null)
      mockMercadoPagoService.cancelPreapprovalInMercadoPago.mockResolvedValue(
        {},
      )

      txMock = createTxMock()
      mockPrismaService.$transaction.mockImplementation(
        (callback: (tx: typeof txMock) => Promise<unknown>) => callback(txMock),
      )
    })

    it('✅ Idempotencia: Si el pago ya está registrado (P2002), responde idempotente sin tocar la suscripción', async () => {
      txMock.processedPayment.create.mockRejectedValue(
        Object.assign(new Error('Prisma Error'), { code: 'P2002' }),
      )

      const result = await service.processWebhook(mockPayload)

      expect(result).toEqual({
        status: 'idempotent',
        message: 'Pago ya fue procesado',
      })
      expect(txMock.userSubscription.updateMany).not.toHaveBeenCalled()
      expect(mockSubscriptionRewardsService.grantRewards).not.toHaveBeenCalled()
    })

    it('✅ Alta: El evento que pasa la suscripción de PENDING a ACTIVE entrega el regalo una sola vez', async () => {
      const result = await service.processWebhook(mockPayload)

      expect(txMock.userSubscription.updateMany).toHaveBeenCalledTimes(1)
      expect(txMock.userSubscription.updateMany.mock.calls[0][0]).toMatchObject(
        {
          where: { id: mockLocalSub.id, status: SubscriptionStatus.PENDING },
          data: { status: SubscriptionStatus.ACTIVE },
        },
      )
      expect(mockSubscriptionRewardsService.grantRewards).toHaveBeenCalledWith(
        'user-123',
        SubscriptionTier.TIER_2,
        txMock,
      )
      expect(txMock.user.update).toHaveBeenCalled()
      // Un usuario que nunca recibió monedas no tiene wallet: se crea para registrar el pago
      expect(txMock.wallet.upsert.mock.calls[0][0]).toMatchObject({
        where: { userId: 'user-123' },
        create: { userId: 'user-123' },
      })
      expect(mockWalletService.syncBalanceCache).toHaveBeenCalledWith(
        'user-123',
      )
      expect(mockEventEmitter.emit).toHaveBeenCalledTimes(1)
      expect(mockEventEmitter.emit.mock.calls[0][0]).toBe(
        'subscription.purchased',
      )
      expect(result.message).toBe(
        'Pago procesado y beneficios aplicados correctamente.',
      )
    })

    it('✅ Renovación: Un pago sobre una suscripción ya activa solo extiende el período, sin regalos', async () => {
      txMock.userSubscription.updateMany
        .mockResolvedValueOnce({ count: 0 })
        .mockResolvedValueOnce({ count: 1 })

      const result = await service.processWebhook(mockPayload)

      expect(txMock.userSubscription.updateMany.mock.calls[1][0]).toMatchObject(
        {
          where: {
            id: mockLocalSub.id,
            OR: [
              { status: SubscriptionStatus.ACTIVE },
              { status: SubscriptionStatus.GRACE_PERIOD },
              { status: SubscriptionStatus.EXPIRED, autoRenew: true },
            ],
          },
          data: { status: SubscriptionStatus.ACTIVE },
        },
      )
      expect(mockSubscriptionRewardsService.grantRewards).not.toHaveBeenCalled()
      expect(mockEventEmitter.emit).not.toHaveBeenCalled()
      expect(mockWalletService.syncBalanceCache).not.toHaveBeenCalled()
      expect(txMock.coinTransaction.create).toHaveBeenCalledTimes(1)
      expect(result.message).toBe('Pago procesado: período renovado.')
    })

    it('❌ Fail - Otra activa: No reactiva una en GRACE_PERIOD o EXPIRED por falta de pago si el usuario ya tiene otra suscripción ACTIVE', async () => {
      txMock.userSubscription.updateMany.mockResolvedValue({ count: 0 })
      txMock.userSubscription.count.mockResolvedValue(1)

      await service.processWebhook(mockPayload)

      const renewalWhere = (
        txMock.userSubscription.updateMany.mock.calls[1] as [
          { where: { OR: unknown[] } },
        ]
      )[0].where
      expect(renewalWhere.OR).toHaveLength(1)
      expect(txMock.user.update).not.toHaveBeenCalled()
    })

    it('❌ Fail - Suscripción vencida: Un cobro sobre una EXPIRED que no se puede reactivar no cambia el tier y cancela su débito en MP', async () => {
      mockPrismaService.userSubscription.findFirst.mockResolvedValue({
        ...mockLocalSub,
        status: SubscriptionStatus.EXPIRED,
      })
      txMock.userSubscription.updateMany.mockResolvedValue({ count: 0 })

      const result = await service.processWebhook(mockPayload)

      expect(txMock.user.update).not.toHaveBeenCalled()
      expect(mockSubscriptionRewardsService.grantRewards).not.toHaveBeenCalled()
      expect(txMock.coinTransaction.create).toHaveBeenCalledTimes(1)
      expect(
        mockMercadoPagoService.cancelPreapprovalInMercadoPago,
      ).toHaveBeenCalledWith('mp-preapp-local')
      expect(result.message).toBe(
        'Pago registrado sin reactivar la suscripción.',
      )
    })

    it('✅ Upgrade: Vence la suscripción vieja, paga el bono una vez y limpia Redis después del commit aunque MP falle al cancelar', async () => {
      mockRedisService.redis.get.mockResolvedValue(oldSub.id)
      txMock.userSubscription.findMany.mockResolvedValue([oldSub])
      mockSubscriptionPricingService.calculateUpgradeBonus.mockReturnValue({
        daysRemaining: 10,
        bonusCoins: 2000,
        coinsPerDay: 200,
      })
      mockMercadoPagoService.cancelPreapprovalInMercadoPago.mockRejectedValue(
        new Error('Mercado Pago API Timeout o Error 500'),
      )

      const result = await service.processWebhook(mockPayload)

      expect(result.status).toBe('success')
      expect(txMock.userSubscription.updateMany).toHaveBeenCalledWith({
        where: {
          id: oldSub.id,
          status: SubscriptionStatus.ACTIVE,
          autoRenew: true,
        },
        data: { status: SubscriptionStatus.EXPIRED, autoRenew: false },
      })
      expect(
        mockSubscriptionPricingService.calculateUpgradeBonus,
      ).toHaveBeenCalledWith(oldSub.endsAt, 3000)
      expect(addCoinsCall()[0]).toMatchObject({
        userId: 'user-123',
        amount: 2000,
        enforceCap: false,
      })
      expect(addCoinsCall()[1]).toBe(txMock)
      expect(mockRedisService.redis.del).toHaveBeenCalledWith(
        'subscription:upgrade:ref-checkout-999',
      )
      expect(
        mockRedisService.redis.del.mock.invocationCallOrder[0],
      ).toBeGreaterThan(
        txMock.userSubscription.findUnique.mock.invocationCallOrder[0],
      )
      expect(
        mockMercadoPagoService.cancelPreapprovalInMercadoPago,
      ).toHaveBeenCalledWith(oldSub.mpPreapprovalId)
    })

    it('❌ Fail - Upgrade ya cobrado: Si otra alta ya venció la suscripción vieja, no paga el bono ni cancela en MP', async () => {
      mockRedisService.redis.get.mockResolvedValue(oldSub.id)
      txMock.userSubscription.findMany.mockResolvedValue([oldSub])
      txMock.userSubscription.updateMany
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 })

      await service.processWebhook(mockPayload)

      expect(mockWalletService.addCoins).not.toHaveBeenCalled()
      expect(
        mockMercadoPagoService.cancelPreapprovalInMercadoPago,
      ).not.toHaveBeenCalled()
      expect(mockSubscriptionRewardsService.grantRewards).toHaveBeenCalledTimes(
        1,
      )
    })

    it('✅ Una sola vigente: Si la key del upgrade venció, el alta igual vence y cancela la vieja, sin bono', async () => {
      txMock.userSubscription.findMany.mockResolvedValue([oldSub])

      await service.processWebhook(mockPayload)

      expect(txMock.userSubscription.updateMany).toHaveBeenCalledWith({
        where: {
          id: oldSub.id,
          status: SubscriptionStatus.ACTIVE,
          autoRenew: true,
        },
        data: { status: SubscriptionStatus.EXPIRED, autoRenew: false },
      })
      expect(mockWalletService.addCoins).not.toHaveBeenCalled()
      expect(
        mockMercadoPagoService.cancelPreapprovalInMercadoPago,
      ).toHaveBeenCalledWith(oldSub.mpPreapprovalId)
    })

    it('✅ Una sola vigente: Una suscripción en GRACE_PERIOD reemplazada por la nueva se vence y se cancela, sin bono', async () => {
      mockRedisService.redis.get.mockResolvedValue(oldSub.id)
      txMock.userSubscription.findMany.mockResolvedValue([
        { ...oldSub, status: SubscriptionStatus.GRACE_PERIOD },
      ])

      await service.processWebhook(mockPayload)

      expect(txMock.userSubscription.updateMany).toHaveBeenCalledWith({
        where: {
          id: oldSub.id,
          status: SubscriptionStatus.GRACE_PERIOD,
          autoRenew: true,
        },
        data: { status: SubscriptionStatus.EXPIRED, autoRenew: false },
      })
      expect(mockWalletService.addCoins).not.toHaveBeenCalled()
      expect(
        mockMercadoPagoService.cancelPreapprovalInMercadoPago,
      ).toHaveBeenCalledWith(oldSub.mpPreapprovalId)
    })

    it('✅ Una sola vigente: Una EXPIRED por falta de pago con el débito vivo se da de baja en MP al activar la nueva', async () => {
      const expiredSub = { ...oldSub, status: SubscriptionStatus.EXPIRED }
      txMock.userSubscription.findMany.mockResolvedValue([expiredSub])

      await service.processWebhook(mockPayload)

      const [{ where }] = txMock.userSubscription.findMany.mock.calls[0] as [
        { where: { OR: unknown[] } },
      ]
      expect(where.OR).toContainEqual({
        status: SubscriptionStatus.EXPIRED,
        autoRenew: true,
      })
      expect(txMock.userSubscription.updateMany).toHaveBeenCalledWith({
        where: {
          id: oldSub.id,
          status: SubscriptionStatus.EXPIRED,
          autoRenew: true,
        },
        data: { status: SubscriptionStatus.EXPIRED, autoRenew: false },
      })
      expect(mockWalletService.addCoins).not.toHaveBeenCalled()
      expect(
        mockMercadoPagoService.cancelPreapprovalInMercadoPago,
      ).toHaveBeenCalledWith(oldSub.mpPreapprovalId)
    })

    it('✅ Estado intermedio: Un authorized_payment en scheduled se ignora y no pasa la suscripción a GRACE_PERIOD', async () => {
      mockMercadoPagoService.getPaymentDetails.mockResolvedValue({
        status: 'scheduled',
        external_reference: 'ref-checkout-999',
      })

      const result = await service.processWebhook(mockPayload)

      expect(result.status).toBe('ignored')
      expect(
        mockPrismaService.userSubscription.updateMany,
      ).not.toHaveBeenCalled()
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled()
    })

    it('✅ Fallo de pago: Un cobro en recycling solo pasa a GRACE_PERIOD una suscripción ACTIVE', async () => {
      mockMercadoPagoService.getPaymentDetails.mockResolvedValue({
        status: 'recycling',
        external_reference: 'ref-checkout-999',
      })
      mockPrismaService.userSubscription.updateMany.mockResolvedValue({
        count: 0,
      })

      const result = await service.processWebhook(mockPayload)

      expect(result.status).toBe('failed')
      expect(
        mockPrismaService.userSubscription.updateMany.mock.calls[0][0],
      ).toMatchObject({
        where: {
          mpExternalRef: 'ref-checkout-999',
          status: SubscriptionStatus.ACTIVE,
        },
        data: { status: SubscriptionStatus.GRACE_PERIOD },
      })
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled()
    })

    it('✅ Autorización: El preapproval autorizado no activa ni regala nada hasta el primer cobro', async () => {
      mockMercadoPagoService.getPaymentDetails.mockResolvedValue({
        status: 'authorized',
        external_reference: 'ref-checkout-999',
      })

      const result = await service.processWebhook(
        buildPayload('subscription_preapproval'),
      )

      expect(result.status).toBe('ignored')
      expect(
        mockPrismaService.processedPayment.findUnique,
      ).not.toHaveBeenCalled()
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled()
      expect(mockSubscriptionRewardsService.grantRewards).not.toHaveBeenCalled()
    })

    it('❌ Fail - Cobro rechazado: Un authorized_payment procesado con el pago rechazado no activa la suscripción', async () => {
      mockMercadoPagoService.getPaymentDetails.mockResolvedValue({
        status: 'processed',
        external_reference: 'ref-checkout-999',
        payment: { id: 1, status: 'rejected' },
      })
      mockPrismaService.userSubscription.updateMany.mockResolvedValue({
        count: 0,
      })

      const result = await service.processWebhook(mockPayload)

      expect(result.status).toBe('failed')
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled()
    })

    it('❌ Fail - Sin referencia: Un pago sin external_reference se ignora sin tocar ninguna suscripción', async () => {
      mockMercadoPagoService.getPaymentDetails.mockResolvedValue({
        status: 'rejected',
      })

      const result = await service.processWebhook(mockPayload)

      expect(result.status).toBe('ignored')
      expect(
        mockPrismaService.userSubscription.updateMany,
      ).not.toHaveBeenCalled()
      expect(
        mockPrismaService.userSubscription.findFirst,
      ).not.toHaveBeenCalled()
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled()
    })
  })
})
