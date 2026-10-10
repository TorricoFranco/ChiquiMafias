import { Test, TestingModule } from '@nestjs/testing'
import { BetsService } from './bets.service'
import { PrismaService } from '../prisma/prisma.service'
import { WalletService } from '../wallet/wallet.service'
import { BetsGateway } from './bets.gateway'
import { ChatGateway } from '../chat/chat.gateway'
import { RedisService } from '../redis/redis.service'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { getQueueToken } from '@nestjs/bullmq'
import { BadRequestException, NotFoundException } from '@nestjs/common'

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
    userStats: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
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

  const mockWalletService = {
    syncBalanceCache: jest.fn(),
  }

  // Orden de llamada de la última invocación de un mock (para "antes/después")
  const lastCallOrder = (mock: jest.Mock) =>
    mock.mock.invocationCallOrder[mock.mock.invocationCallOrder.length - 1]

  // Datos de cada CoinTransaction creada, tipados para afirmar sobre ellos
  const coinTransactionsCreated = () =>
    (
      mockPrisma.coinTransaction.create.mock.calls as [
        { data: Record<string, unknown> },
      ][]
    ).map(([args]) => args.data)

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BetsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedisService },
        { provide: BetsGateway, useValue: mockBetsGateway },
        { provide: ChatGateway, useValue: mockChatGateway },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: WalletService, useValue: mockWalletService },
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

      // 3. Verificamos los estados de las apuestas: el payout es el premio, no el stake
      expect(mockPrisma.bet.update).toHaveBeenCalledWith({
        where: { id: 'bet-1' },
        data: { status: 'WON', payout: 1500, multiplier: 1.5 },
      })
      expect(mockPrisma.bet.update).toHaveBeenCalledWith({
        where: { id: 'bet-2' },
        data: { status: 'LOST', payout: 0, multiplier: 1.5 },
      })

      // El premio queda registrado como movimiento de la wallet
      const movements = coinTransactionsCreated()
      expect(movements).toHaveLength(1)
      expect(movements[0]).toMatchObject({
        walletId: 'wallet-1',
        amount: 1500,
        type: 'BET_PAYOUT',
        referenceId: 'bet-1',
      })

      // Redis: se cierra el mercado y el saldo se sincroniza recién después del commit
      expect(mockRedisService.redis.hset).toHaveBeenCalledWith(
        `market:${marketId}`,
        'status',
        'SETTLED',
      )
      expect(mockRedisService.redis.set).not.toHaveBeenCalled()
      // Sin valor: relee la DB, por si otra operación cambió el saldo tras el commit
      expect(mockWalletService.syncBalanceCache).toHaveBeenCalledTimes(1)
      expect(mockWalletService.syncBalanceCache).toHaveBeenCalledWith('user-1')
      expect(lastCallOrder(mockPrisma.userStats.updateMany)).toBeLessThan(
        lastCallOrder(mockWalletService.syncBalanceCache),
      )

      // Timeout propio: un mercado grande no entra en los 5 s por defecto
      expect(mockPrisma.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ timeout: 60_000 }),
      )

      // 4. Stats: el ganador suma la victoria y el perdedor corta su racha
      expect(mockPrisma.userStats.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      )
      expect(mockPrisma.userStats.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-2' },
        data: { currentWinStreak: 0 },
      })

      // 5. Verificamos que se emitieron los eventos correctos
      expect(mockBetsGateway.emitMarketStatusChange).toHaveBeenCalledWith(
        marketId,
        'SETTLED',
      )
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('bet.settled', {
        userId: 'user-1',
        status: 'WON',
        coins: 1500,
        matchTitle: undefined,
      })
    })

    it('Un usuario con varias apuestas ganadoras cobra cada una y se sincroniza una sola vez', async () => {
      mockPrisma.market.findUnique.mockResolvedValue({
        id: 'market-123',
        status: 'LOCKED',
        options: [
          {
            id: 'opt-A',
            totalStaked: 300,
            bets: [
              { id: 'bet-1', userId: 'user-1', stake: 100 },
              { id: 'bet-2', userId: 'user-1', stake: 200 },
            ],
          },
          {
            id: 'opt-B',
            totalStaked: 300,
            bets: [{ id: 'bet-3', userId: 'user-2', stake: 300 }],
          },
        ],
      })
      mockPrisma.market.updateMany.mockResolvedValue({ count: 1 })
      mockPrisma.wallet.update.mockResolvedValue({ id: 'w', balance: 1600 })

      await service.settleMarket('market-123', {
        status: 'SETTLED',
        winningOptionId: 'opt-A',
      })

      // Multiplicador 2: 100 -> 200 y 200 -> 400
      expect(
        coinTransactionsCreated().map((data) => [
          data.referenceId,
          data.amount,
        ]),
      ).toEqual([
        ['bet-1', 200],
        ['bet-2', 400],
      ])
      expect(mockWalletService.syncBalanceCache).toHaveBeenCalledTimes(1)
      expect(mockWalletService.syncBalanceCache).toHaveBeenCalledWith('user-1')
    })

    it('Debe redondear cada premio para abajo sin repartir más que el pozo', async () => {
      // Pozo 1000, ganadora con 300 -> multiplicador 3,33...
      mockPrisma.market.findUnique.mockResolvedValue({
        id: 'market-123',
        status: 'LOCKED',
        options: [
          {
            id: 'opt-A',
            totalStaked: 300,
            bets: [
              { id: 'bet-1', userId: 'user-1', stake: 100 },
              { id: 'bet-2', userId: 'user-2', stake: 100 },
              { id: 'bet-3', userId: 'user-3', stake: 100 },
            ],
          },
          {
            id: 'opt-B',
            totalStaked: 700,
            bets: [{ id: 'bet-4', userId: 'user-4', stake: 700 }],
          },
        ],
      })
      mockPrisma.market.updateMany.mockResolvedValue({ count: 1 })
      mockPrisma.wallet.update.mockResolvedValue({ id: 'w', balance: 333 })

      await service.settleMarket('market-123', {
        status: 'SETTLED',
        winningOptionId: 'opt-A',
      })

      const payouts = (
        mockPrisma.wallet.update.mock.calls as [
          { data: { balance: { increment: number } } },
        ][]
      ).map(([args]) => args.data.balance.increment)
      expect(payouts).toEqual([333, 333, 333])
      expect(payouts.reduce((sum, p) => sum + p, 0)).toBeLessThanOrEqual(1000)
    })

    it('Debe lanzar BadRequestException sin opción ganadora y no cerrar el mercado en Redis', async () => {
      await expect(
        service.settleMarket('market-123', { status: 'SETTLED' }),
      ).rejects.toThrow(BadRequestException)

      expect(mockRedisService.redis.hset).not.toHaveBeenCalled()
      expect(mockPrisma.$transaction).not.toHaveBeenCalled()
    })

    it('Debe lanzar NotFoundException si la opción no es del mercado, sin cerrarlo en Redis', async () => {
      mockPrisma.market.findUnique.mockResolvedValue({
        status: 'OPEN',
        options: [{ id: 'opt-A' }],
      })

      await expect(
        service.settleMarket('market-123', {
          status: 'SETTLED',
          winningOptionId: 'opt-de-otro-mercado',
        }),
      ).rejects.toThrow(NotFoundException)

      expect(mockRedisService.redis.hset).not.toHaveBeenCalled()
      expect(mockPrisma.$transaction).not.toHaveBeenCalled()
    })

    it('Debe lanzar BadRequestException si el mercado ya fue liquidado, sin tocar Redis ni pagar', async () => {
      mockPrisma.market.findUnique.mockResolvedValue({
        status: 'SETTLED',
        options: [{ id: 'opt-A' }],
      })

      await expect(
        service.settleMarket('market-123', { status: 'REFUNDED' }),
      ).rejects.toThrow(BadRequestException)

      expect(mockRedisService.redis.hset).not.toHaveBeenCalled()
      expect(mockPrisma.wallet.update).not.toHaveBeenCalled()
    })

    it('Si la transacción falla no debe sincronizar saldos ni emitir eventos', async () => {
      mockPrisma.market.findUnique.mockResolvedValue({
        id: 'market-123',
        status: 'LOCKED',
        options: [
          {
            id: 'opt-A',
            totalStaked: 100,
            bets: [{ id: 'bet-1', userId: 'user-1', stake: 100 }],
          },
          {
            id: 'opt-B',
            totalStaked: 100,
            bets: [{ id: 'bet-2', userId: 'user-2', stake: 100 }],
          },
        ],
      })
      mockPrisma.market.updateMany.mockResolvedValue({ count: 1 })
      mockPrisma.wallet.update.mockResolvedValue({ id: 'w', balance: 300 })
      mockPrisma.bet.update.mockRejectedValueOnce(new Error('DB caída'))

      await expect(
        service.settleMarket('market-123', {
          status: 'SETTLED',
          winningOptionId: 'opt-A',
        }),
      ).rejects.toThrow('DB caída')

      expect(mockWalletService.syncBalanceCache).not.toHaveBeenCalled()
      expect(mockEventEmitter.emit).not.toHaveBeenCalled()
      expect(mockBetsGateway.emitMarketStatusChange).not.toHaveBeenCalled()
    })

    it('Si Redis falla al sincronizar después del commit, igual debe emitir los eventos', async () => {
      mockPrisma.market.findUnique.mockResolvedValue({
        id: 'market-123',
        status: 'LOCKED',
        options: [
          {
            id: 'opt-A',
            totalStaked: 100,
            bets: [{ id: 'bet-1', userId: 'user-1', stake: 100 }],
          },
          {
            id: 'opt-B',
            totalStaked: 100,
            bets: [{ id: 'bet-2', userId: 'user-2', stake: 100 }],
          },
        ],
      })
      mockPrisma.market.updateMany.mockResolvedValue({ count: 1 })
      mockPrisma.wallet.update.mockResolvedValue({ id: 'w', balance: 300 })
      mockWalletService.syncBalanceCache.mockRejectedValueOnce(
        new Error('Redis caído'),
      )

      await expect(
        service.settleMarket('market-123', {
          status: 'SETTLED',
          winningOptionId: 'opt-A',
        }),
      ).resolves.toMatchObject({ status: 'SETTLED' })

      expect(mockBetsGateway.emitMarketStatusChange).toHaveBeenCalledWith(
        'market-123',
        'SETTLED',
      )
      expect(mockEventEmitter.emit).toHaveBeenCalledTimes(2)
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
        data: { status: 'REFUNDED', payout: 500, multiplier: 1 },
      })

      expect(coinTransactionsCreated()[0]).toMatchObject({
        walletId: 'wallet-2',
        amount: 500,
        type: 'BET_REFUND',
        referenceId: 'bet-2',
      })
      expect(mockRedisService.redis.set).not.toHaveBeenCalled()
      expect(mockWalletService.syncBalanceCache).toHaveBeenCalledWith('user-2')

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

      expect(mockPrisma.wallet.update).not.toHaveBeenCalled()
      expect(mockWalletService.syncBalanceCache).not.toHaveBeenCalled()
      expect(mockEventEmitter.emit).not.toHaveBeenCalled()
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
      mockPrisma.market.findUnique.mockResolvedValue({
        id: dto.marketId,
        options: [
          { id: dto.optionId, initialProb: 50, totalStaked: 1000 },
          { id: 'opt-2', initialProb: 50, totalStaked: 500 },
        ],
      })

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
          newOdds: 1.85,
          options: [
            { id: dto.optionId, currentOdds: 1.85, totalStaked: 1500 },
            { id: 'opt-2', currentOdds: 2.18, totalStaked: 500 },
          ],
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
