import { Test, TestingModule } from '@nestjs/testing'
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { PricingService } from './pricing.service'
import { PrismaService } from '../prisma/prisma.service'
import { PRICE_LOG_RECENT_LIMIT } from './constants/pricing.constants'

describe('PricingService', () => {
  let service: PricingService

  const mockPrisma = {
    // Ejecuta el callback con este mismo mock, así lo de adentro de la transacción
    // usa los mismos espías.
    $transaction: jest
      .fn()
      .mockImplementation((callback: (tx: unknown) => unknown) =>
        callback(mockPrisma),
      ),
    user: {
      findUnique: jest.fn(),
    },
    coinPack: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      updateMany: jest.fn(),
    },
    storeItem: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      updateMany: jest.fn(),
    },
    subscriptionPlan: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      updateMany: jest.fn(),
    },
    storeDiscount: {
      findMany: jest.fn(),
    },
    priceChangeLog: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  }

  const president = {
    id: 'president-1',
    username: 'elpresidente',
    email: 'presi@chiquimafias.test',
    role: 'PRESIDENT',
    status: 'ACTIVE',
  }

  const asPresident = () =>
    mockPrisma.user.findUnique.mockResolvedValue(president)

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()

    service = module.get<PricingService>(PricingService)
  })

  describe('assertPresidentInDb (revalidación del rol)', () => {
    const cases = [
      ['el usuario ya no es PRESIDENT', { ...president, role: 'ADMIN' }],
      ['el usuario está baneado', { ...president, status: 'BANNED' }],
      ['el usuario no existe', null],
    ] as const

    for (const [caso, usuario] of cases) {
      it(`Debe lanzar ForbiddenException si ${caso}, sin abrir la transacción`, async () => {
        mockPrisma.user.findUnique.mockResolvedValue(usuario)

        await expect(
          service.updateCoinPackPrice('president-1', 'pack-1', 2000),
        ).rejects.toThrow(ForbiddenException)

        expect(mockPrisma.$transaction).not.toHaveBeenCalled()
        expect(mockPrisma.priceChangeLog.create).not.toHaveBeenCalled()
      })
    }
  })

  describe('updateCoinPackPrice', () => {
    const pack = { id: 'pack-1', name: 'Pack Hincha', priceARS: 1500 }

    it('Debe actualizar el precio y registrar el cambio en la misma transacción', async () => {
      asPresident()
      mockPrisma.coinPack.findUnique.mockResolvedValue(pack)
      mockPrisma.coinPack.updateMany.mockResolvedValue({ count: 1 })
      mockPrisma.priceChangeLog.create.mockResolvedValue({
        id: 'log-1',
        entity: 'COIN_PACK',
        entityId: pack.id,
        entityName: pack.name,
        oldPrice: 1500,
        newPrice: 2500,
        currency: 'ARS',
      })
      mockPrisma.coinPack.findUniqueOrThrow.mockResolvedValue({
        ...pack,
        priceARS: 2500,
      })

      const result = await service.updateCoinPackPrice(
        'president-1',
        'pack-1',
        2500,
      )

      expect(result.changed).toBe(true)
      // Lock optimista: el update condiciona sobre el precio que se leyó.
      expect(mockPrisma.coinPack.updateMany).toHaveBeenCalledWith({
        where: { id: 'pack-1', priceARS: 1500 },
        data: { priceARS: 2500 },
      })
      expect(mockPrisma.priceChangeLog.create).toHaveBeenCalledWith({
        data: {
          entity: 'COIN_PACK',
          entityId: 'pack-1',
          entityName: 'Pack Hincha',
          oldPrice: 1500,
          newPrice: 2500,
          currency: 'ARS',
          changedById: 'president-1',
          changedByUsername: 'elpresidente',
        },
      })
    })

    it('Debe lanzar ConflictException si otro cambio se aplicó primero, sin dejar auditoría', async () => {
      asPresident()
      mockPrisma.coinPack.findUnique.mockResolvedValue(pack)
      mockPrisma.coinPack.updateMany.mockResolvedValue({ count: 0 })

      await expect(
        service.updateCoinPackPrice('president-1', 'pack-1', 2500),
      ).rejects.toThrow(ConflictException)

      expect(mockPrisma.priceChangeLog.create).not.toHaveBeenCalled()
    })

    it('Debe ser idempotente ante doble click: mismo precio, sin update ni auditoría', async () => {
      asPresident()
      mockPrisma.coinPack.findUnique.mockResolvedValue(pack)
      mockPrisma.coinPack.findUniqueOrThrow.mockResolvedValue(pack)

      const result = await service.updateCoinPackPrice(
        'president-1',
        'pack-1',
        1500,
      )

      expect(result.changed).toBe(false)
      expect(result.change).toBeNull()
      expect(mockPrisma.coinPack.updateMany).not.toHaveBeenCalled()
      expect(mockPrisma.priceChangeLog.create).not.toHaveBeenCalled()
    })

    it('Debe lanzar NotFoundException si el pack no existe', async () => {
      asPresident()
      mockPrisma.coinPack.findUnique.mockResolvedValue(null)

      await expect(
        service.updateCoinPackPrice('president-1', 'pack-404', 2500),
      ).rejects.toThrow(NotFoundException)

      expect(mockPrisma.coinPack.updateMany).not.toHaveBeenCalled()
    })
  })

  describe('updateStoreItemPrice', () => {
    const item = { id: 'item-1', name: 'Banner Bombonera', price: 2000 }

    it('Debe actualizar el precio en monedas y auditarlo con currency COINS', async () => {
      asPresident()
      mockPrisma.storeItem.findUnique.mockResolvedValue(item)
      mockPrisma.storeItem.updateMany.mockResolvedValue({ count: 1 })
      mockPrisma.priceChangeLog.create.mockResolvedValue({ id: 'log-2' })
      mockPrisma.storeItem.findUniqueOrThrow.mockResolvedValue({
        ...item,
        price: 2800,
      })

      await service.updateStoreItemPrice('president-1', 'item-1', 2800)

      expect(mockPrisma.storeItem.updateMany).toHaveBeenCalledWith({
        where: { id: 'item-1', price: 2000 },
        data: { price: 2800 },
      })
      expect(mockPrisma.priceChangeLog.create).toHaveBeenCalledWith({
        data: {
          entity: 'STORE_ITEM',
          entityId: 'item-1',
          entityName: 'Banner Bombonera',
          oldPrice: 2000,
          newPrice: 2800,
          currency: 'COINS',
          changedById: 'president-1',
          changedByUsername: 'elpresidente',
        },
      })
    })

    it('Debe lanzar ConflictException si otro cambio se aplicó primero', async () => {
      asPresident()
      mockPrisma.storeItem.findUnique.mockResolvedValue(item)
      mockPrisma.storeItem.updateMany.mockResolvedValue({ count: 0 })

      await expect(
        service.updateStoreItemPrice('president-1', 'item-1', 2800),
      ).rejects.toThrow(ConflictException)
    })

    it('Debe lanzar NotFoundException si el ítem no existe', async () => {
      asPresident()
      mockPrisma.storeItem.findUnique.mockResolvedValue(null)

      await expect(
        service.updateStoreItemPrice('president-1', 'item-404', 2800),
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('updateSubscriptionPlanPrice', () => {
    const plan = { id: 'plan-1', name: 'Plateísta', basePriceARS: 4000 }

    it('Debe actualizar el precio base y auditarlo como SUBSCRIPTION_PLAN', async () => {
      asPresident()
      mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(plan)
      mockPrisma.subscriptionPlan.updateMany.mockResolvedValue({ count: 1 })
      mockPrisma.priceChangeLog.create.mockResolvedValue({ id: 'log-3' })
      mockPrisma.subscriptionPlan.findUniqueOrThrow.mockResolvedValue({
        ...plan,
        basePriceARS: 5000,
      })

      await service.updateSubscriptionPlanPrice('president-1', 'plan-1', 5000)

      expect(mockPrisma.subscriptionPlan.updateMany).toHaveBeenCalledWith({
        where: { id: 'plan-1', basePriceARS: 4000 },
        data: { basePriceARS: 5000 },
      })
      expect(mockPrisma.priceChangeLog.create).toHaveBeenCalledWith({
        data: {
          entity: 'SUBSCRIPTION_PLAN',
          entityId: 'plan-1',
          entityName: 'Plateísta',
          oldPrice: 4000,
          newPrice: 5000,
          currency: 'ARS',
          changedById: 'president-1',
          changedByUsername: 'elpresidente',
        },
      })
    })

    it('Debe lanzar ConflictException si otro cambio se aplicó primero', async () => {
      asPresident()
      mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(plan)
      mockPrisma.subscriptionPlan.updateMany.mockResolvedValue({ count: 0 })

      await expect(
        service.updateSubscriptionPlanPrice('president-1', 'plan-1', 5000),
      ).rejects.toThrow(ConflictException)
    })

    it('Debe lanzar NotFoundException si el plan no existe', async () => {
      asPresident()
      mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(null)

      await expect(
        service.updateSubscriptionPlanPrice('president-1', 'plan-404', 5000),
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('getPricingOverview', () => {
    it('Debe devolver packs, ítems, planes, descuentos vigentes y los últimos cambios', async () => {
      mockPrisma.coinPack.findMany.mockResolvedValue([{ id: 'pack-1' }])
      mockPrisma.storeItem.findMany.mockResolvedValue([{ id: 'item-1' }])
      mockPrisma.subscriptionPlan.findMany.mockResolvedValue([{ id: 'plan-1' }])
      mockPrisma.storeDiscount.findMany.mockResolvedValue([])
      mockPrisma.priceChangeLog.findMany.mockResolvedValue([{ id: 'log-1' }])

      const overview = await service.getPricingOverview()

      expect(overview.coinPacks).toHaveLength(1)
      expect(overview.storeItems).toHaveLength(1)
      expect(overview.subscriptionPlans).toHaveLength(1)
      expect(overview.recentChanges).toHaveLength(1)
      expect(overview.coinValueARS).toBe(0.5)
      expect(mockPrisma.priceChangeLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: PRICE_LOG_RECENT_LIMIT,
          orderBy: { createdAt: 'desc' },
        }),
      )
    })

    it('Debe pedir solo los descuentos activos y vigentes a la fecha', async () => {
      mockPrisma.coinPack.findMany.mockResolvedValue([])
      mockPrisma.storeItem.findMany.mockResolvedValue([])
      mockPrisma.subscriptionPlan.findMany.mockResolvedValue([])
      mockPrisma.storeDiscount.findMany.mockResolvedValue([])
      mockPrisma.priceChangeLog.findMany.mockResolvedValue([])

      await service.getPricingOverview()

      const [[args]] = mockPrisma.storeDiscount.findMany.mock.calls as [
        [
          {
            where: {
              isActive: boolean
              startDate: { lte: Date }
              endDate: { gte: Date }
            }
          },
        ],
      ]
      expect(args.where.isActive).toBe(true)
      expect(args.where.startDate.lte).toBeInstanceOf(Date)
      expect(args.where.endDate.gte).toBeInstanceOf(Date)
    })
  })
})
