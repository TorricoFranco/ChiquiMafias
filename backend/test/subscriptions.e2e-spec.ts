import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import request from 'supertest'
import { SubscriptionsController } from '../src/subscriptions/subscriptions.controller'
import { SubscriptionsService } from '../src/subscriptions/subscriptions.service'
import { SubscriptionCheckoutService } from '../src/subscriptions/subscription-checkout.service'
import { SubscriptionPricingService } from '../src/subscriptions/domain/subscription-pricing.service'
import { RolesGuard } from '../src/auth/guards/roles.guard'
import { SubscriptionTier, SystemRole } from '@prisma/client'
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard'

const mockAuthGuard = {
  canActivate: (context) => {
    const req = context.switchToHttp().getRequest()
    req.user = {
      id: 'user-123',
      activeSubscriptionTier: SubscriptionTier.FREE,
      role: SystemRole.USER,
    }
    return true
  },
}

const mockRolesGuard = {
  canActivate: (context) => {
    const req = context.switchToHttp().getRequest()
    const roles = Reflect.getMetadata('roles', context.getHandler())
    if (!roles) return true

    if (!req.user) {
      req.user = {
        id: 'user-123',
        activeSubscriptionTier: SubscriptionTier.FREE,
        role: SystemRole.USER,
      }
    }

    return roles.includes(req.user.role)
  },
}

describe('SubscriptionsController (e2e)', () => {
  let app: INestApplication

  const mockSubscriptionsService = {
    getCurrentSubscription: jest.fn(),
    updatePlanPrice: jest.fn(),
    deleteUserSubscriptions: jest.fn(),
  }

  const mockCheckoutService = {
    startCheckout: jest.fn(),
    cancelSubscription: jest.fn(),
    upgradeSubscription: jest.fn(),
  }

  const mockPricingService = {
    getPlans: jest.fn(),
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionsController],

      providers: [
        { provide: SubscriptionsService, useValue: mockSubscriptionsService },
        { provide: SubscriptionCheckoutService, useValue: mockCheckoutService },
        { provide: SubscriptionPricingService, useValue: mockPricingService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockAuthGuard)
      .overrideGuard(JwtAuthGuard)
      .useValue(mockAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile()

    app = moduleFixture.createNestApplication()

    app.use((req, res, next) => {
      req.user = {
        id: 'user-123',
        activeSubscriptionTier: SubscriptionTier.FREE,
        role: SystemRole.USER,
      }
      next()
    })

    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    )

    await app.init()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('GET /subscriptions/plans', () => {
    it('debería retornar la grilla de planes (200 OK)', async () => {
      mockPricingService.getPlans.mockResolvedValue([
        { tier: 'PRO', price: 5000 },
      ])

      const response = await request(app.getHttpServer())
        .get('/subscriptions/plans')
        .expect(200)

      expect(response.body).toEqual([{ tier: 'PRO', price: 5000 }])
      expect(mockPricingService.getPlans).toHaveBeenCalled()
    })
  })

  describe('POST /subscriptions/checkout', () => {
    it('debería validar el DTO y lanzar 400 si falta el tier', async () => {
      await request(app.getHttpServer())
        .post('/subscriptions/checkout')
        .send({})
        .expect(400)

      expect(mockCheckoutService.startCheckout).not.toHaveBeenCalled()
    })

    it('debería iniciar el checkout y devolver la URL de Mercado Pago (200 OK)', async () => {
      mockCheckoutService.startCheckout.mockResolvedValue({
        url: 'https://mercadopago.com.ar/checkout/123',
      })

      const response = await request(app.getHttpServer())
        .post('/subscriptions/checkout')
        .send({ tier: SubscriptionTier.TIER_1 })
        .expect(200)

      expect(response.body.url).toBe('https://mercadopago.com.ar/checkout/123')
      expect(mockCheckoutService.startCheckout).toHaveBeenCalledWith(
        'user-123',
        'TIER_1',
      )
    })
  })

  describe('PATCH /subscriptions/plans/price (Admin)', () => {
    it('debería denegar el acceso si el usuario no es ADMIN (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .patch('/subscriptions/plans/price')
        .send({ tier: SubscriptionTier.PRO, basePriceARS: 15000 })
        .expect(403)
    })
  })
})
