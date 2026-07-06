import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { StreaksService } from './streaks.service'
import { PrismaService } from '../prisma/prisma.service'
import { WalletService } from '../wallet/wallet.service'

describe('StreaksService', () => {
  let service: StreaksService
  let prismaService: PrismaService
  let walletService: WalletService

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userInventory: {
      upsert: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  }

  const mockWalletService = {
    addCoins: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreaksService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WalletService, useValue: mockWalletService },
      ],
    }).compile()

    service = module.get<StreaksService>(StreaksService)
    prismaService = module.get<PrismaService>(PrismaService)
    walletService = module.get<WalletService>(WalletService)

    jest.clearAllMocks()
  })

  it('debería estar definido', () => {
    expect(service).toBeDefined()
  })

  describe('handleAutoCheckIn', () => {
    const userId = 'user-uuid-test'

    it('debería iniciar racha en 1 si es el primer check-in histórico del usuario', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        currentStreak: 0,
        lastCheckIn: null,
        streakRewardClaimed: true,
      })

      const result = await service.handleAutoCheckIn(userId)

      expect(result).toEqual({
        incremented: true,
        currentStreak: 1,
        canClaimReward: true,
      })
      expect(mockPrismaService.user.update).toHaveBeenCalled()
    })

    it('debería mantener el estado si el usuario vuelve a entrar el mismo día', async () => {
      const now = new Date() // Fecha actual del test
      mockPrismaService.user.findUnique.mockResolvedValue({
        currentStreak: 5,
        lastCheckIn: now,
        streakRewardClaimed: false,
      })

      const result = await service.handleAutoCheckIn(userId)

      expect(result).toEqual({
        incremented: false,
        currentStreak: 5,
        canClaimReward: true, // Sigue teniendo disponible el botón si no cobró
      })
      expect(mockPrismaService.user.update).not.toHaveBeenCalled()
    })

    it('debería incrementar la racha en +1 si entra al día siguiente', async () => {
      // Forzamos "ayer" restando 24 horas exactas
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)

      mockPrismaService.user.findUnique.mockResolvedValue({
        currentStreak: 4,
        lastCheckIn: yesterday,
        streakRewardClaimed: true,
      })

      const result = await service.handleAutoCheckIn(userId)

      expect(result.incremented).toBe(true)
      expect(result.currentStreak).toBe(5)
    })

    it('debería reiniciar la racha a 1 si el usuario no entró por varios días (Racha Rota)', async () => {
      // Forzamos racha rota restando 5 días
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)

      mockPrismaService.user.findUnique.mockResolvedValue({
        currentStreak: 42,
        lastCheckIn: fiveDaysAgo,
        streakRewardClaimed: true,
      })

      const result = await service.handleAutoCheckIn(userId)

      expect(result.currentStreak).toBe(1)
      expect(result.incremented).toBe(true)
    })
  })

  describe('claimDailyReward', () => {
    const userId = 'user-uuid-test'

    it('debería lanzar un error si el usuario ya reclamó el premio de hoy', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        currentStreak: 3,
        streakRewardClaimed: true,
      })

      await expect(service.claimDailyReward(userId, 'FREE')).rejects.toThrow(
        BadRequestException,
      )
    })

    it('debería calcular el premio exponencial para un usuario FREE en el Día 3', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        currentStreak: 3, // Formula: 100 * (1.25)^(3-1) = 100 * 1.5625 = 156 coins
        streakRewardClaimed: false,
      })

      const result = await service.claimDailyReward(userId, 'FREE')

      expect(result.coinsAwarded).toBe(156)
      expect(walletService.addCoins).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 156 }),
      )
    })

    it('debería aplicar el multiplicador de suscripción correctamente (ej: TIER_3 da x2)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        currentStreak: 3, // 156 de base * 2.0 (TIER_3) = 312 coins
        streakRewardClaimed: false,
      })

      const result = await service.claimDailyReward(userId, 'TIER_3')

      expect(result.coinsAwarded).toBe(312)
    })

    it('debería congelar el premio exponencial a partir del día 14 en adelante', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        currentStreak: 25, // Mayor a 14, usa el tope del día 14 (~1818 coins de base)
        streakRewardClaimed: false,
      })

      const result = await service.claimDailyReward(userId, 'FREE')

      expect(result.coinsAwarded).toBe(1818)
    })

    it('debería regalar el cosmético correspondiente si cae en un día especial declarado', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        currentStreak: 10, // El día 10 configuramos el Megáfono de Cancha
        streakRewardClaimed: false,
      })

      const result = await service.claimDailyReward(userId, 'FREE')

      expect(result.cosmeticAwarded).toBe('Megáfono de Cancha')
      // Verificamos que se llamó al upsert de inventario
      expect(mockPrismaService.userInventory.upsert).toHaveBeenCalled()
    })
  })
})
