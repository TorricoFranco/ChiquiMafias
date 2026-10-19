import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { StoreService } from './store.service'
import { PrismaService } from '../prisma/prisma.service'
import { WalletService } from '../wallet/wallet.service'
import { ChatGateway } from '../chat/chat.gateway'

describe('StoreService (buyItem)', () => {
  let service: StoreService

  const WEDNESDAY = new Date('2026-10-07T15:00:00')
  const SUNDAY = new Date('2026-10-11T15:00:00')

  const banner = {
    id: 'item-banner',
    name: 'El Templo',
    type: 'BANNER',
    price: 2000,
    isActive: true,
    isPurchasable: true,
  }

  const megaphone = {
    id: 'item-megaphone',
    name: 'Megáfono',
    type: 'MEGAPHONE',
    price: 400,
    isActive: true,
    isPurchasable: true,
  }

  const mockPrisma = {
    $transaction: jest
      .fn()
      .mockImplementation((callback: (tx: unknown) => Promise<unknown>) =>
        callback(mockPrisma),
      ),
    user: { findUnique: jest.fn() },
    subscriptionPlan: { findUnique: jest.fn() },
    storeItem: { findUnique: jest.fn() },
    storeDiscount: { findMany: jest.fn() },
    userInventory: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  }

  const mockWalletService = {
    subtractCoins: jest.fn(),
    syncBalanceCache: jest.fn(),
  }

  const mockChatGateway = {
    sendWalletUpdate: jest.fn(),
  }

  const subtractCall = () =>
    mockWalletService.subtractCoins.mock.calls[0] as [
      { amount: number; description: string; type: string; userId: string },
      unknown,
    ]

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WalletService, useValue: mockWalletService },
        { provide: ChatGateway, useValue: mockChatGateway },
      ],
    }).compile()

    service = module.get<StoreService>(StoreService)

    jest.clearAllMocks()
    // Miércoles: sin la promo de domingo, salvo en el test que la prueba
    jest.useFakeTimers().setSystemTime(WEDNESDAY)

    mockPrisma.user.findUnique.mockResolvedValue({
      activeSubscriptionTier: null,
    })
    mockPrisma.storeItem.findUnique.mockResolvedValue(banner)
    mockPrisma.storeDiscount.findMany.mockResolvedValue([])
    mockPrisma.userInventory.findUnique.mockResolvedValue(null)
    mockPrisma.userInventory.create.mockResolvedValue({ id: 'inv-1' })
    mockWalletService.subtractCoins.mockResolvedValue({ balance: 500 })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('Debe cobrar dentro de la transacción, crear el inventario y sincronizar el saldo después del commit', async () => {
    await expect(service.buyItem('user-1', banner.id)).resolves.toEqual({
      id: 'inv-1',
    })

    expect(mockWalletService.subtractCoins).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        amount: 2000,
        type: 'STORE_PURCHASE',
      }),
      mockPrisma,
    )
    expect(mockPrisma.userInventory.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', itemId: banner.id, quantity: 1 },
    })
    expect(mockWalletService.syncBalanceCache).toHaveBeenCalledWith(
      'user-1',
      500,
    )
    expect(mockChatGateway.sendWalletUpdate).toHaveBeenCalledWith('user-1', 500)
    expect(
      mockPrisma.userInventory.create.mock.invocationCallOrder[0],
    ).toBeLessThan(
      mockWalletService.syncBalanceCache.mock.invocationCallOrder[0],
    )
  })

  it('Debe aplicar solo los dos mejores descuentos y topearlos en 90%', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      activeSubscriptionTier: 'TIER_3',
    })
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue({
      storeDiscountPercentage: 45,
    })
    mockPrisma.storeDiscount.findMany.mockResolvedValue([
      { name: 'Todo al 25', percentage: 25, scope: 'ALL' },
      {
        name: 'Semana de banners',
        percentage: 50,
        scope: 'BY_TYPE',
        targetType: 'BANNER',
      },
      {
        name: 'Otro ítem',
        percentage: 80,
        scope: 'SPECIFIC_ITEM',
        targetItemId: 'item-otro',
      },
    ])

    await service.buyItem('user-1', banner.id)

    // 50 + 45 = 95 -> tope 90%: 2000 - 1800 = 200. El de 25 y el de otro ítem no cuentan
    const [operation] = subtractCall()
    expect(operation.amount).toBe(200)
    expect(operation.description).toContain('Semana de banners')
    expect(operation.description).toContain('Beneficio TIER 3')
    expect(operation.description).not.toContain('Todo al 25')
    expect(operation.description).not.toContain('Otro ítem')
  })

  it('Debe aplicar la promo de domingo', async () => {
    jest.setSystemTime(SUNDAY)

    await service.buyItem('user-1', banner.id)

    expect(subtractCall()[0].amount).toBe(1900)
  })

  it('Debe cobrar la cantidad pedida de un consumible y sumarla al stock existente', async () => {
    mockPrisma.storeItem.findUnique.mockResolvedValue(megaphone)
    mockPrisma.userInventory.findUnique.mockResolvedValue({
      id: 'inv-mega',
      quantity: 2,
    })

    await service.buyItem('user-1', megaphone.id, 3)

    expect(subtractCall()[0].amount).toBe(1200)
    expect(mockPrisma.userInventory.update).toHaveBeenCalledWith({
      where: { id: 'inv-mega' },
      data: { quantity: { increment: 3 } },
    })
    expect(mockPrisma.userInventory.create).not.toHaveBeenCalled()
  })

  it('Debe cobrar una sola unidad de un ítem permanente aunque pidan más', async () => {
    await service.buyItem('user-1', banner.id, 3)

    expect(subtractCall()[0].amount).toBe(2000)
    expect(mockPrisma.userInventory.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', itemId: banner.id, quantity: 1 },
    })
  })

  it('Debe lanzar BadRequestException si ya tiene el ítem permanente, sin cobrar', async () => {
    mockPrisma.userInventory.findUnique.mockResolvedValue({
      id: 'inv-1',
      quantity: 1,
    })

    await expect(service.buyItem('user-1', banner.id)).rejects.toThrow(
      BadRequestException,
    )
    expect(mockWalletService.subtractCoins).not.toHaveBeenCalled()
  })

  it('Debe lanzar BadRequestException si el ítem es exclusivo (no comprable), sin cobrar', async () => {
    mockPrisma.storeItem.findUnique.mockResolvedValue({
      ...banner,
      isPurchasable: false,
    })

    await expect(service.buyItem('user-1', banner.id)).rejects.toThrow(
      BadRequestException,
    )
    expect(mockWalletService.subtractCoins).not.toHaveBeenCalled()
  })

  it('Debe lanzar NotFoundException si el ítem está inactivo, sin cobrar', async () => {
    mockPrisma.storeItem.findUnique.mockResolvedValue({
      ...banner,
      isActive: false,
    })

    await expect(service.buyItem('user-1', banner.id)).rejects.toThrow(
      NotFoundException,
    )
    expect(mockWalletService.subtractCoins).not.toHaveBeenCalled()
  })

  it('Debe lanzar BadRequestException si la cantidad es menor a 1, sin consultar la DB', async () => {
    await expect(service.buyItem('user-1', megaphone.id, 0)).rejects.toThrow(
      BadRequestException,
    )
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('Si el saldo no alcanza no debe entregar el ítem ni sincronizar el saldo', async () => {
    mockWalletService.subtractCoins.mockRejectedValue(
      new BadRequestException('Saldo insuficiente'),
    )

    await expect(service.buyItem('user-1', banner.id)).rejects.toThrow(
      'Saldo insuficiente',
    )
    expect(mockPrisma.userInventory.create).not.toHaveBeenCalled()
    expect(mockWalletService.syncBalanceCache).not.toHaveBeenCalled()
    expect(mockChatGateway.sendWalletUpdate).not.toHaveBeenCalled()
  })
})
