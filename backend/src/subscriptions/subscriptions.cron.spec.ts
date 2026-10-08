import { Test, TestingModule } from '@nestjs/testing'
import { SubscriptionStatus } from '@prisma/client'
import { SubscriptionsCronService } from './subscriptions.cron'
import { PrismaService } from 'src/prisma/prisma.service'
import { ChatGateway } from 'src/chat/chat.gateway'

describe('SubscriptionsCronService', () => {
  let service: SubscriptionsCronService

  const mockPrisma = {
    $transaction: jest
      .fn()
      .mockImplementation((callback: (tx: unknown) => Promise<unknown>) =>
        callback(mockPrisma),
      ),
    userSubscription: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    user: { update: jest.fn() },
  }

  const emit = jest.fn()
  const mockChatGateway = {
    server: { to: jest.fn().mockReturnValue({ emit }) },
  }

  const graceSub = {
    id: 'sub-grace',
    userId: 'user-1',
    status: SubscriptionStatus.GRACE_PERIOD,
  }
  const activeSub = {
    id: 'sub-active',
    userId: 'user-2',
    status: SubscriptionStatus.ACTIVE,
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsCronService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ChatGateway, useValue: mockChatGateway },
      ],
    }).compile()

    service = module.get<SubscriptionsCronService>(SubscriptionsCronService)

    jest.clearAllMocks()
    // Caso 1 (vencidas) y caso 2 (ACTIVE sin cobro): un lote cada uno y después vacío
    mockPrisma.userSubscription.findMany
      .mockResolvedValueOnce([graceSub])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([activeSub])
      .mockResolvedValueOnce([])
    mockPrisma.userSubscription.count.mockResolvedValue(0)
  })

  it('Debe vencer con update condicional y bajar el tier del usuario', async () => {
    mockPrisma.userSubscription.updateMany.mockResolvedValue({ count: 1 })

    await service.handleSubscriptionLifecycle()

    const [expireCall, graceCall] = mockPrisma.userSubscription.updateMany.mock
      .calls as [[Record<string, unknown>], [Record<string, unknown>]]
    expect(expireCall[0]).toMatchObject({
      where: { id: 'sub-grace', status: SubscriptionStatus.GRACE_PERIOD },
      data: { status: SubscriptionStatus.EXPIRED },
    })
    expect(mockPrisma.user.update).toHaveBeenCalledTimes(1)
    expect(graceCall[0]).toMatchObject({
      where: { id: 'sub-active', status: SubscriptionStatus.ACTIVE },
      data: { status: SubscriptionStatus.GRACE_PERIOD },
    })
    expect(emit).toHaveBeenCalledTimes(2)
  })

  it('No debe pisar una suscripción que un cobro renovó mientras corría el cron', async () => {
    mockPrisma.userSubscription.updateMany.mockResolvedValue({ count: 0 })

    await service.handleSubscriptionLifecycle()

    expect(mockPrisma.user.update).not.toHaveBeenCalled()
    expect(emit).not.toHaveBeenCalled()
  })

  it('Al vencer una suscripción no debe bajar el tier si el usuario ya tiene otra vigente', async () => {
    mockPrisma.userSubscription.updateMany.mockResolvedValue({ count: 1 })
    mockPrisma.userSubscription.count.mockResolvedValue(1)

    await service.handleSubscriptionLifecycle()

    expect(mockPrisma.user.update).not.toHaveBeenCalled()
    // Solo el aviso de período de gracia de la ACTIVE del caso 2
    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit).toHaveBeenCalledWith(
      'subscription:grace_period',
      expect.anything(),
    )
  })
})
