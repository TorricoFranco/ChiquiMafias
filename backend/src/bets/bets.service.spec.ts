import { Test, TestingModule } from '@nestjs/testing'
import { BetsService } from './bets.service'
import { PrismaService } from '../prisma/prisma.service'
import { WalletService } from '../wallet/wallet.service'
import { BetsGateway } from './bets.gateway'
import { ChatGateway } from '../chat/chat.gateway'
import { RedisService } from '../redis/redis.service'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { getQueueToken } from '@nestjs/bullmq'
import { BadRequestException } from '@nestjs/common'

describe('BetsService', () => {
  let service: BetsService
  let prisma: PrismaService

  const mockPrisma = {
    $transaction: jest.fn().mockImplementation(async (callback) => {
      // El truco de la transacción: ejecutamos el callback pasándole este mismo mock
      return callback(mockPrisma)
    }),
    market: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    wallet: {
      update: jest.fn(),
    },
    coinTransaction: {
      create: jest.fn(),
    },
    bet: {
      update: jest.fn(),
    },
  }

  const mockRedisService = {
    redis: {
      hset: jest.fn(),
      set: jest.fn(),
      eval: jest.fn(),
    },
  }

  const mockBetsGateway = {
    emitMarketStatusChange: jest.fn(),
    emitPoolUpdate: jest.fn(),
  }

  const mockChatGateway = {
    sendWalletUpdate: jest.fn(),
  }

  const mockEventEmitter = {
    emit: jest.fn(),
  }

  const mockQueue = {
    add: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BetsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedisService },
        { provide: BetsGateway, useValue: mockBetsGateway },
        { provide: ChatGateway, useValue: mockChatGateway },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: WalletService, useValue: {} }, // No se usa directamente en settleMarket
        { provide: getQueueToken('bets-queue'), useValue: mockQueue },
      ],
    }).compile()

    service = module.get<BetsService>(BetsService)
    prisma = module.get<PrismaService>(PrismaService)

    jest.clearAllMocks()
  })

  // suite de settleMarket
  describe('settleMarket', () => {
    it('Debe liquidar correctamente y repartir el pozo con la matemática exacta (Caso Feliz)', async () => {
      // Setup de datos falsos
      const marketId = 'market-123'
      const optionAId = 'opt-A' // Ganadora
      const optionBId = 'opt-B' // Perdedora

      // Pool total: 1000 + 500 = 1500
      // Multiplicador esperado: 1500 / 1000 = 1.5
      // Usuario 1 apostó 1000 -> Debería recibir 1500 (1000 * 1.5)
      const mockMarketData = {
        id: marketId,
        status: 'LOCKED',
        options: [
          {
            id: optionAId,
            name: 'Boca',
            totalStaked: 1000,
            bets: [{ id: 'bet-1', userId: 'user-1', stake: 1000 }],
          },
          {
            id: optionBId,
            name: 'River',
            totalStaked: 500,
            bets: [{ id: 'bet-2', userId: 'user-2', stake: 500 }],
          },
        ],
      }

      mockPrisma.market.findUnique.mockResolvedValue(mockMarketData)
      // Simulamos que obtenemos el lock en la base de datos
      mockPrisma.market.updateMany.mockResolvedValue({ count: 1 })
      mockPrisma.wallet.update.mockResolvedValue({
        id: 'wallet-1',
        balance: 2500,
      })

      // Ejecutamos la función
      await service.settleMarket(marketId, {
        status: 'SETTLED',
        winningOptionId: optionAId,
      })

      // Aserciones (Verificamos que pasó lo que tenía que pasar)
      // 1. Verificamos que se actualizó la billetera del ganador con el monto correcto
      expect(mockPrisma.wallet.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { balance: { increment: 1500 } }, // 1000 * 1.5 = 1500
      })

      // 2. Verificamos que al perdedor NO se le actualizó la billetera
      expect(mockPrisma.wallet.update).not.toHaveBeenCalledWith({
        where: { userId: 'user-2' },
        data: expect.any(Object),
      })

      // 3. Verificamos los estados de las apuestas
      expect(mockPrisma.bet.update).toHaveBeenCalledWith({
        where: { id: 'bet-1' },
        data: { status: 'WON' },
      })
      expect(mockPrisma.bet.update).toHaveBeenCalledWith({
        where: { id: 'bet-2' },
        data: { status: 'LOST' },
      })

      // 4. Verificamos que se emitieron los eventos correctos
      expect(mockBetsGateway.emitMarketStatusChange).toHaveBeenCalledWith(
        marketId,
        'SETTLED',
      )
    })

    it('Debe disparar REEMBOLSO si la opción ganadora tiene 0 apuestas', async () => {
      const marketId = 'market-123'
      const optionAId = 'opt-A' // Ganadora (sin apuestas)
      const optionBId = 'opt-B' // Perdedora (con apuestas)

      const mockMarketData = {
        id: marketId,
        status: 'LOCKED',
        title: 'Boca vs River',
        options: [
          {
            id: optionAId,
            totalStaked: 0,
            bets: [],
          },
          {
            id: optionBId,
            totalStaked: 500,
            bets: [{ id: 'bet-2', userId: 'user-2', stake: 500 }],
          },
        ],
      }

      mockPrisma.market.findUnique.mockResolvedValue(mockMarketData)
      mockPrisma.market.updateMany.mockResolvedValue({ count: 1 })
      mockPrisma.wallet.update.mockResolvedValue({
        id: 'wallet-2',
        balance: 500,
      })

      await service.settleMarket(marketId, {
        status: 'SETTLED',
        winningOptionId: optionAId,
      })

      // reembolso
      expect(mockPrisma.wallet.update).toHaveBeenCalledWith({
        where: { userId: 'user-2' },
        data: { balance: { increment: 500 } },
      })

      expect(mockPrisma.bet.update).toHaveBeenCalledWith({
        where: { id: 'bet-2' },
        data: { status: 'REFUNDED' },
      })

      // debe ser REFUNDED y no SETTLED
      expect(mockPrisma.market.updateMany).toHaveBeenCalledWith({
        where: { id: marketId, status: 'LOCKED' },
        data: { status: 'REFUNDED', settledAt: expect.any(Date) },
      })
    })

    it('Debe fallar si otro proceso ya tomó el lock (Concurrencia simulada)', async () => {
      const marketId = 'market-123'
      const optionAId = 'opt-A'

      mockPrisma.market.findUnique.mockResolvedValue({
        status: 'LOCKED',
        options: [{ id: optionAId, totalStaked: 100 }],
      })

      mockPrisma.market.updateMany.mockResolvedValue({ count: 0 })

      await expect(
        service.settleMarket(marketId, {
          status: 'SETTLED',
          winningOptionId: optionAId,
        }),
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('placeBet', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('Debe procesar la apuesta, emitir eventos WS y encolar en BullMQ (Caso Feliz)', async () => {
      const userId = 'user-123'
      const dto = { optionId: 'opt-1', stake: 100, marketId: 'market-1' }

      const mockNow = 1700000000000
      jest.spyOn(Date, 'now').mockReturnValue(mockNow)

      const luaResponse = JSON.stringify({
        ok: true,
        new_balance: 900,
        new_pool: 1500,
      })

      mockRedisService.redis.eval.mockResolvedValue(luaResponse)

      const result = await service.placeBet(userId, dto)

      expect(mockRedisService.redis.eval).toHaveBeenCalledWith(
        expect.any(String),
        3,
        `wallet:${userId}:balance`,
        `market:${dto.marketId}`,
        dto.optionId,
        dto.stake,
        mockNow,
      )

      expect(mockChatGateway.sendWalletUpdate).toHaveBeenCalledWith(userId, 900)
      expect(mockBetsGateway.emitPoolUpdate).toHaveBeenCalledWith(
        dto.marketId,
        {
          optionId: dto.optionId,
          newTotalStaked: 1500,
        },
      )

      expect(mockQueue.add).toHaveBeenCalledWith('persist-bet', {
        betId: expect.any(String),
        userId,
        optionId: dto.optionId,
        marketId: dto.marketId,
        stake: dto.stake,
        timestamp: mockNow,
      })

      expect(result).toEqual({
        id: expect.any(String),
        status: 'ACCEPTED_PENDING_SAVE',
        message: 'Apuesta tomada con éxito',
      })

      jest.restoreAllMocks()
    })

    it('Debe lanzar BadRequestException si Lua devuelve un error (ej: Saldo insuficiente)', async () => {
      const userId = 'user-123'
      const dto = { optionId: 'opt-1', stake: 5000, marketId: 'market-1' }

      const luaResponse = JSON.stringify({
        error: 'Saldo insuficiente',
      })
      mockRedisService.redis.eval.mockResolvedValue(luaResponse)

      await expect(service.placeBet(userId, dto)).rejects.toThrow(
        BadRequestException,
      )
      await expect(service.placeBet(userId, dto)).rejects.toThrow(
        'Saldo insuficiente',
      )

      expect(mockChatGateway.sendWalletUpdate).not.toHaveBeenCalled()
      expect(mockBetsGateway.emitPoolUpdate).not.toHaveBeenCalled()
      expect(mockQueue.add).not.toHaveBeenCalled()
    })
  })
})
