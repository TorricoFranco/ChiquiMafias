import { Test, TestingModule } from '@nestjs/testing'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { BadRequestException } from '@nestjs/common'
import { PollsService } from './polls.service'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'
import { WalletService } from '../wallet/wallet.service'

describe('PollsService', () => {
  let service: PollsService

  const mockPrisma = {
    $transaction: jest
      .fn()
      .mockImplementation((callback: (tx: unknown) => Promise<unknown>) =>
        callback(mockPrisma),
      ),
    vote: { findMany: jest.fn(), updateMany: jest.fn() },
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PollsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: { redis: {} } },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: WalletService, useValue: mockWalletService },
      ],
    }).compile()

    service = module.get<PollsService>(PollsService)

    jest.clearAllMocks()
    mockPrisma.vote.findMany.mockResolvedValue([
      { id: 'vote-1' },
      { id: 'vote-2' },
      { id: 'vote-3' },
    ])
  })

  describe('claimAllPendingRewards', () => {
    it('Debe pagar solo los votos que este claim logró marcar, en la misma transacción', async () => {
      // Un claim simultáneo ya se llevó uno de los tres votos
      mockPrisma.vote.updateMany.mockResolvedValue({ count: 2 })

      const result = await service.claimAllPendingRewards('user-1')

      expect(mockPrisma.vote.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['vote-1', 'vote-2', 'vote-3'] },
          rewardClaimed: false,
        },
        data: { rewardClaimed: true },
      })
      expect(addCoinsCall()[0]).toMatchObject({
        userId: 'user-1',
        amount: 100,
      })
      expect(addCoinsCall()[1]).toBe(mockPrisma)
      expect(mockWalletService.syncBalanceCache).toHaveBeenCalledWith('user-1')
      expect(result).toMatchObject({ claimedCount: 2, coinsAwarded: 100 })
    })

    it('Debe lanzar BadRequestException si otro claim simultáneo ya marcó todos los votos', async () => {
      mockPrisma.vote.updateMany.mockResolvedValue({ count: 0 })

      await expect(service.claimAllPendingRewards('user-1')).rejects.toThrow(
        BadRequestException,
      )
      expect(mockWalletService.addCoins).not.toHaveBeenCalled()
      expect(mockWalletService.syncBalanceCache).not.toHaveBeenCalled()
    })

    it('Debe lanzar BadRequestException si no hay votos pendientes', async () => {
      mockPrisma.vote.findMany.mockResolvedValue([])

      await expect(service.claimAllPendingRewards('user-1')).rejects.toThrow(
        BadRequestException,
      )
      expect(mockPrisma.$transaction).not.toHaveBeenCalled()
    })
  })
})
