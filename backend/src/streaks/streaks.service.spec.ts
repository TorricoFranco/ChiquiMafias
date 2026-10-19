import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { StreaksService } from './streaks.service'
import { PrismaService } from '../prisma/prisma.service'
import { WalletService } from '../wallet/wallet.service'

describe('StreaksService', () => {
  let service: StreaksService

  const mockPrisma = {
    $transaction: jest
      .fn()
      .mockImplementation((callback: (tx: unknown) => Promise<unknown>) =>
        callback(mockPrisma),
      ),
    user: { findUnique: jest.fn(), updateMany: jest.fn() },
    storeItem: { findUnique: jest.fn() },
    userInventory: { findUnique: jest.fn(), upsert: jest.fn() },
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

  const sapardo = {
    id: 'item-sapardo',
    name: 'Sticker Animado - Sapardo',
    type: 'STICKER_PACK',
    price: 6000,
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreaksService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WalletService, useValue: mockWalletService },
      ],
    }).compile()

    service = module.get<StreaksService>(StreaksService)

    jest.clearAllMocks()
    mockPrisma.user.updateMany.mockResolvedValue({ count: 1 })
  })

  const creditedCoins = () =>
    (mockWalletService.addCoins.mock.calls[0] as [{ amount: number }])[0].amount

  describe('claimDailyReward', () => {
    it('Debe marcar el premio con update condicional, acreditar en la misma transacción y sincronizar Redis después', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        currentStreak: 7,
        streakRewardClaimed: false,
      })

      const result = await service.claimDailyReward('user-1', 'FREE')

      expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: 'user-1', streakRewardClaimed: false },
        data: { streakRewardClaimed: true },
      })
      expect(creditedCoins()).toBe(298)
      expect(addCoinsCall()[1]).toBe(mockPrisma)
      expect(mockWalletService.syncBalanceCache).toHaveBeenCalledWith('user-1')
      expect(result.coinsAwarded).toBe(298)
    })

    it('Debe lanzar BadRequestException si otro claim simultáneo ya marcó el premio', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        currentStreak: 7,
        streakRewardClaimed: false,
      })
      mockPrisma.user.updateMany.mockResolvedValue({ count: 0 })

      await expect(service.claimDailyReward('user-1', 'FREE')).rejects.toThrow(
        BadRequestException,
      )
      expect(mockWalletService.addCoins).not.toHaveBeenCalled()
      expect(mockWalletService.syncBalanceCache).not.toHaveBeenCalled()
    })

    it('Debe compensar con tope de 500 un regalo de hito que el usuario ya tiene', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        currentStreak: 20,
        streakRewardClaimed: false,
      })
      mockPrisma.storeItem.findUnique.mockResolvedValue(sapardo)
      mockPrisma.userInventory.findUnique.mockResolvedValue({ id: 'inv-1' })

      const result = await service.claimDailyReward('user-1', 'TIER_3')

      expect(mockPrisma.storeItem.findUnique).toHaveBeenCalledWith({
        where: { assetId: 'st_sapardo' },
      })
      expect(mockPrisma.userInventory.upsert).not.toHaveBeenCalled()
      // 596 de la racha al tope con TIER_3 + 500 de compensación (no 60 % de 6000)
      expect(creditedCoins()).toBe(1096)
      expect(result.cosmeticAwarded).toContain('+500 monedas')
    })

    it('Debe entregar el regalo de hito si el usuario no lo tiene', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        currentStreak: 20,
        streakRewardClaimed: false,
      })
      mockPrisma.storeItem.findUnique.mockResolvedValue(sapardo)
      mockPrisma.userInventory.findUnique.mockResolvedValue(null)

      const result = await service.claimDailyReward('user-1', 'TIER_3')

      expect(mockPrisma.userInventory.upsert).toHaveBeenCalled()
      expect(creditedCoins()).toBe(596)
      expect(result.cosmeticAwarded).toBe(sapardo.name)
    })
  })
})
