import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { BetsCronService } from './bets-cron'
import { PrismaService } from '../prisma/prisma.service'
import { BetsService } from './bets.service'
import { BetsGateway } from './bets.gateway'
import { RedisService } from '../redis/redis.service'

describe('BetsCronService', () => {
  let service: BetsCronService

  const mockPrisma = {
    $transaction: jest.fn(),
    market: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    matches: {
      findMany: jest.fn(),
    },
  }

  const mockBetsService = {
    settleMarket: jest.fn(),
  }

  const mockBetsGateway = {
    emitMarketStatusChange: jest.fn(),
    emitMarketCreated: jest.fn(),
  }

  const mockRedisService = {
    redis: { hset: jest.fn() },
  }

  // Mercado automático como lo crea handleMarketAutoCreation
  const buildMarket = (id: string, fixtureId: number) => ({
    id,
    title: 'Boca Juniors vs River Plate - Torneo Argentino',
    status: 'LOCKED',
    isManual: false,
    fixtureId,
    metadata: {
      homeTeam: { name: 'Boca Juniors' },
      awayTeam: { name: 'River Plate' },
    },
    options: [
      { id: `${id}-home`, name: 'Boca Juniors' },
      { id: `${id}-draw`, name: 'Empate' },
      { id: `${id}-away`, name: 'River Plate' },
    ],
  })

  const buildMatch = (
    fixtureId: number,
    status_short: string,
    home_goals: number | null,
    away_goals: number | null,
  ) => ({
    api_fixture_id: fixtureId,
    status_short,
    home_goals,
    away_goals,
    home_team: { name: 'Boca Juniors' },
    away_team: { name: 'River Plate' },
  })

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BetsCronService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BetsService, useValue: mockBetsService },
        { provide: BetsGateway, useValue: mockBetsGateway },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile()

    service = module.get<BetsCronService>(BetsCronService)

    jest.clearAllMocks()
  })

  describe('handleMarketLocking', () => {
    it('Debe bloquear cada mercado con update condicional y emitir LOCKED solo si lo bloqueó', async () => {
      mockPrisma.market.findMany.mockResolvedValue([
        { id: 'market-1' },
        { id: 'market-2' },
      ])
      // market-2 lo liquidaron entre la lectura y el update
      mockPrisma.market.updateMany
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 })

      await service.handleMarketLocking()

      expect(mockPrisma.market.updateMany).toHaveBeenCalledWith({
        where: { id: 'market-1', status: 'OPEN' },
        data: { status: 'LOCKED' },
      })
      expect(mockPrisma.market.updateMany).toHaveBeenCalledWith({
        where: { id: 'market-2', status: 'OPEN' },
        data: { status: 'LOCKED' },
      })
      expect(mockBetsGateway.emitMarketStatusChange).toHaveBeenCalledTimes(1)
      expect(mockBetsGateway.emitMarketStatusChange).toHaveBeenCalledWith(
        'market-1',
        'LOCKED',
      )
    })

    it('No debe escribir nada si no hay mercados para bloquear', async () => {
      mockPrisma.market.findMany.mockResolvedValue([])

      await service.handleMarketLocking()

      expect(mockPrisma.market.updateMany).not.toHaveBeenCalled()
      expect(mockBetsGateway.emitMarketStatusChange).not.toHaveBeenCalled()
    })
  })

  describe('handleMarketSettlement', () => {
    const runWith = async (
      matches: ReturnType<typeof buildMatch>[],
      markets = [buildMarket('market-1', 100)],
    ) => {
      mockPrisma.market.findMany.mockResolvedValue(markets)
      mockPrisma.matches.findMany.mockResolvedValue(matches)
      await service.handleMarketSettlement()
    }

    it('Debe buscar solo mercados automáticos LOCKED y sus partidos en una sola consulta', async () => {
      await runWith(
        [buildMatch(100, 'NS', null, null), buildMatch(200, 'NS', null, null)],
        [buildMarket('market-1', 100), buildMarket('market-2', 200)],
      )

      expect(mockPrisma.market.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 'LOCKED',
            isManual: false,
            fixtureId: { not: null },
          },
        }),
      )
      expect(mockPrisma.matches.findMany).toHaveBeenCalledTimes(1)
      expect(mockPrisma.matches.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { api_fixture_id: { in: [100, 200] } },
        }),
      )
    })

    it('Debe liquidar con la opción del local si ganó el local (FT 2-1)', async () => {
      await runWith([buildMatch(100, 'FT', 2, 1)])

      expect(mockBetsService.settleMarket).toHaveBeenCalledWith('market-1', {
        status: 'SETTLED',
        winningOptionId: 'market-1-home',
      })
    })

    it('Debe liquidar con Empate si el partido terminó igualado (FT 1-1)', async () => {
      await runWith([buildMatch(100, 'FT', 1, 1)])

      expect(mockBetsService.settleMarket).toHaveBeenCalledWith('market-1', {
        status: 'SETTLED',
        winningOptionId: 'market-1-draw',
      })
    })

    it('Debe liquidar con la opción del visitante si ganó el visitante (FT 0-2)', async () => {
      await runWith([buildMatch(100, 'FT', 0, 2)])

      expect(mockBetsService.settleMarket).toHaveBeenCalledWith('market-1', {
        status: 'SETTLED',
        winningOptionId: 'market-1-away',
      })
    })

    it('Debe usar el nombre guardado en metadata aunque el equipo haya cambiado de nombre', async () => {
      const renamed = {
        ...buildMatch(100, 'FT', 3, 0),
        home_team: { name: 'Club Atlético Boca Juniors' },
      }

      await runWith([renamed])

      expect(mockBetsService.settleMarket).toHaveBeenCalledWith('market-1', {
        status: 'SETTLED',
        winningOptionId: 'market-1-home',
      })
    })

    it('Sin snapshot en metadata debe usar el nombre actual del equipo', async () => {
      const market = { ...buildMarket('market-1', 100), metadata: null }

      await runWith([buildMatch(100, 'FT', 0, 1)], [market])

      expect(mockBetsService.settleMarket).toHaveBeenCalledWith('market-1', {
        status: 'SETTLED',
        winningOptionId: 'market-1-away',
      })
    })

    it('Debe reembolsar el mercado si el partido se canceló', async () => {
      await runWith([buildMatch(100, 'CANC', null, null)])

      expect(mockBetsService.settleMarket).toHaveBeenCalledWith('market-1', {
        status: 'REFUNDED',
      })
    })

    it('No debe liquidar un partido que todavía se está jugando', async () => {
      await runWith([buildMatch(100, '2H', 1, 0)])

      expect(mockBetsService.settleMarket).not.toHaveBeenCalled()
    })

    it('No debe liquidar si el partido del mercado no está en la DB', async () => {
      await runWith([])

      expect(mockBetsService.settleMarket).not.toHaveBeenCalled()
    })

    it('No debe liquidar si el mercado no tiene la opción ganadora (queda para revisión manual)', async () => {
      const market = {
        ...buildMarket('market-1', 100),
        options: [{ id: 'market-1-otro', name: 'Otra cosa' }],
      }

      await runWith([buildMatch(100, 'FT', 2, 1)], [market])

      expect(mockBetsService.settleMarket).not.toHaveBeenCalled()
    })

    it('El error de un mercado no debe cortar la liquidación de los demás', async () => {
      mockBetsService.settleMarket
        .mockRejectedValueOnce(
          new BadRequestException(
            'El mercado ya está siendo liquidado por otra solicitud.',
          ),
        )
        .mockResolvedValueOnce({})

      await runWith(
        [buildMatch(100, 'FT', 2, 1), buildMatch(200, 'FT', 0, 1)],
        [buildMarket('market-1', 100), buildMarket('market-2', 200)],
      )

      expect(mockBetsService.settleMarket).toHaveBeenCalledTimes(2)
      expect(mockBetsService.settleMarket).toHaveBeenLastCalledWith(
        'market-2',
        { status: 'SETTLED', winningOptionId: 'market-2-away' },
      )
    })

    it('No debe consultar partidos si no hay mercados para liquidar', async () => {
      mockPrisma.market.findMany.mockResolvedValue([])

      await service.handleMarketSettlement()

      expect(mockPrisma.matches.findMany).not.toHaveBeenCalled()
      expect(mockBetsService.settleMarket).not.toHaveBeenCalled()
    })
  })
})
