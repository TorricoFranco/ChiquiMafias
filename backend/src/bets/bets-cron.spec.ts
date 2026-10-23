import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { BetsCronService } from './bets-cron'
import { PrismaService } from '../prisma/prisma.service'
import { BetsService } from './bets.service'
import { BetsGateway } from './bets.gateway'
import { RedisService } from '../redis/redis.service'
import { FootballRefsService } from '../football/services/refs.service'

describe('BetsCronService', () => {
  let service: BetsCronService

  const mockPrisma = {
    $transaction: jest.fn(),
    competitionSeason: { findMany: jest.fn() },
    market: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    matches: {
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  }

  const mockBetsService = {
    settleMarket: jest.fn(),
  }

  const mockBetsGateway = {
    emitMarketStatusChange: jest.fn(),
    emitMarketCreated: jest.fn(),
  }

  // Por defecto todo partido tiene ID en el proveedor activo.
  const mockRefs = {
    matchExternalIds: jest.fn((matches: { id: string }[]) =>
      Promise.resolve(new Map(matches.map((m) => [m.id, 1]))),
    ),
  }

  const mockRedisService = {
    redis: { hset: jest.fn(), eval: jest.fn() },
  }

  // Primer argumento de la llamada `call` a un mock, tipado para los asserts.
  type CallArg = {
    where: Record<string, unknown>
    data: Record<string, unknown> & {
      title: string
      options: { create: Record<string, unknown>[] }
    }
  }
  const firstArg = (fn: jest.Mock, call = 0): CallArg =>
    (fn.mock.calls as CallArg[][])[call][0]

  // Mercado automático como lo crea handleMarketAutoCreation
  const buildMarket = (
    id: string,
    fixtureId: number | null,
    matchId: string | null = null,
  ) => ({
    id,
    title: 'Boca Juniors vs River Plate - Liga Profesional',
    status: 'LOCKED',
    isManual: false,
    fixtureId,
    matchId,
    closesAt: new Date('2026-10-20T19:55:00.000Z'),
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
    id = `match-${fixtureId}`,
    date = new Date('2026-10-20T20:00:00.000Z'),
  ) => ({
    id,
    api_fixture_id: fixtureId,
    date,
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
        { provide: FootballRefsService, useValue: mockRefs },
      ],
    }).compile()

    service = module.get<BetsCronService>(BetsCronService)

    jest.clearAllMocks()
    // Por defecto el reclamo del partido sale bien (ningún otro cron lo tomó).
    mockPrisma.matches.updateMany.mockResolvedValue({ count: 1 })
  })

  describe('handleMarketAutoCreation', () => {
    const upcoming = (over: Record<string, unknown> = {}) => ({
      id: 'match-row-1',
      api_fixture_id: 1001,
      date: new Date(Date.now() + 2 * 60 * 60 * 1000),
      home_team: { name: 'Boca Juniors', short_code: 'BOC', api_team_id: 451 },
      away_team: { name: 'River Plate', short_code: 'RIV', api_team_id: 435 },
      league: {
        name: 'Liga Profesional Argentina',
        short_name: 'Liga Profesional',
      },
      ...over,
    })

    const runWith = async (match = upcoming()) => {
      mockPrisma.competitionSeason.findMany.mockResolvedValue([
        { league_id: 'league-1', season: 2026 },
      ])
      mockPrisma.matches.findMany.mockResolvedValue([match])
      mockPrisma.$transaction.mockImplementationOnce(
        async (cb: (tx: unknown) => unknown) => cb(mockPrisma),
      )
      mockPrisma.market.create.mockResolvedValue({
        id: 'market-1',
        options: [],
      })
      mockPrisma.market.findUnique.mockResolvedValue({ status: 'OPEN' })
      await service.handleMarketAutoCreation()
      return firstArg(mockPrisma.market.create).data
    }

    it('Debe guardar el escudo de local y visitante en sus opciones, y ninguno en el empate', async () => {
      const data = await runWith()

      expect(data.options.create).toEqual([
        { name: 'Boca Juniors', initialProb: 33, logoUrl: '451' },
        { name: 'Empate', initialProb: 34 },
        { name: 'River Plate', initialProb: 33, logoUrl: '435' },
      ])
      expect(data.options.create[1]).not.toHaveProperty('logoUrl')
    })

    it('Debe reclamar el partido antes de crear el mercado', async () => {
      await runWith()

      expect(mockPrisma.matches.updateMany).toHaveBeenCalledWith({
        where: { id: 'match-row-1', market_created: false },
        data: { market_created: true },
      })
      expect(
        mockPrisma.matches.updateMany.mock.invocationCallOrder[0],
      ).toBeLessThan(mockPrisma.market.create.mock.invocationCallOrder[0])
    })

    it('No debe abrir un segundo mercado si otra corrida ya reclamó el partido', async () => {
      mockPrisma.competitionSeason.findMany.mockResolvedValue([
        { league_id: 'league-1', season: 2026 },
      ])
      mockPrisma.matches.findMany.mockResolvedValue([upcoming()])
      mockPrisma.$transaction.mockImplementationOnce(
        (cb: (tx: unknown) => unknown) => Promise.resolve(cb(mockPrisma)),
      )
      mockPrisma.matches.updateMany.mockResolvedValue({ count: 0 })

      await service.handleMarketAutoCreation()

      expect(mockPrisma.market.create).not.toHaveBeenCalled()
      expect(mockRedisService.redis.hset).not.toHaveBeenCalled()
      expect(mockBetsGateway.emitMarketCreated).not.toHaveBeenCalled()
    })

    it('No debe filtrar por api_team_id al buscar partidos', async () => {
      await runWith()

      const where = firstArg(mockPrisma.matches.findMany).where
      expect(where).not.toHaveProperty('home_team')
      expect(where).not.toHaveProperty('away_team')
    })

    it('Con equipos sin ID de API-Football debe usar su escudo de Cloudinary', async () => {
      const data = await runWith(
        upcoming({
          home_team: {
            name: 'Midland',
            short_code: null,
            api_team_id: null,
            logo_url:
              'https://res.cloudinary.com/chiqui/image/upload/team_1.png',
          },
          away_team: {
            name: 'Atlanta',
            short_code: null,
            api_team_id: null,
            logo_url: null,
          },
        }),
      )

      expect(data.options.create[0]).toEqual({
        name: 'Midland',
        initialProb: 33,
        logoUrl: 'https://res.cloudinary.com/chiqui/image/upload/team_1.png',
      })
      // Sin escudo: la opción va sin logoUrl y la metadata con null.
      expect(data.options.create[2].logoUrl).toBeUndefined()
      expect(data.metadata).toMatchObject({
        homeTeam: {
          logoUrl: 'https://res.cloudinary.com/chiqui/image/upload/team_1.png',
        },
        awayTeam: { logoUrl: null },
      })
    })

    it('Debe vincular el mercado al partido por matchId y titularlo con la competición', async () => {
      const data = await runWith()

      expect(data).toMatchObject({
        matchId: 'match-row-1',
        fixtureId: 1001,
        title: 'Boca Juniors vs River Plate - Liga Profesional',
      })
    })

    it('Debe crear el mercado aunque el partido no tenga ID de API-Football', async () => {
      const data = await runWith(upcoming({ api_fixture_id: null }))

      expect(data).toMatchObject({ matchId: 'match-row-1', fixtureId: null })
    })

    it('Debe usar el nombre completo si la competición no tiene nombre corto', async () => {
      const data = await runWith(
        upcoming({ league: { name: 'Copa Argentina', short_name: null } }),
      )

      expect(data.title).toBe('Boca Juniors vs River Plate - Copa Argentina')
    })

    it('Debe buscar solo partidos de temporadas con apuestas activadas', async () => {
      await runWith()

      expect(mockPrisma.competitionSeason.findMany).toHaveBeenCalledWith({
        where: { bets_enabled: true, sync_enabled: true },
        select: { league_id: true, season: true },
      })
      const where = firstArg(mockPrisma.matches.findMany).where
      expect(where.OR).toEqual([{ league_id: 'league-1', season: 2026 }])
      expect(where).not.toHaveProperty('api_fixture_id')
    })

    it('No debe abrir mercado para un partido sin ID en el proveedor activo', async () => {
      mockRefs.matchExternalIds.mockResolvedValueOnce(new Map())
      mockPrisma.competitionSeason.findMany.mockResolvedValue([
        { league_id: 'league-1', season: 2026 },
      ])
      mockPrisma.matches.findMany.mockResolvedValue([upcoming()])

      await service.handleMarketAutoCreation()

      expect(mockPrisma.market.create).not.toHaveBeenCalled()
      expect(mockPrisma.$transaction).not.toHaveBeenCalled()
    })

    it('Debe corregir Redis si el mercado se cerró entre el commit y la escritura en Redis', async () => {
      mockPrisma.competitionSeason.findMany.mockResolvedValue([
        { league_id: 'league-1', season: 2026 },
      ])
      mockPrisma.matches.findMany.mockResolvedValue([upcoming()])
      mockPrisma.$transaction.mockImplementationOnce(
        async (cb: (tx: unknown) => unknown) => cb(mockPrisma),
      )
      mockPrisma.market.create.mockResolvedValue({
        id: 'market-1',
        options: [],
      })
      mockPrisma.market.findUnique.mockResolvedValue({ status: 'LOCKED' })

      await service.handleMarketAutoCreation()

      expect(mockRedisService.redis.hset).toHaveBeenLastCalledWith(
        'market:market-1',
        'status',
        'LOCKED',
      )
    })

    it('No debe buscar partidos si ninguna competición tiene apuestas activadas', async () => {
      mockPrisma.competitionSeason.findMany.mockResolvedValue([])

      await service.handleMarketAutoCreation()

      expect(mockPrisma.matches.findMany).not.toHaveBeenCalled()
      expect(mockPrisma.market.create).not.toHaveBeenCalled()
    })
  })

  describe('handleMarketLocking', () => {
    // handleMarketLocking consulta: 1) por hora, 2) por partido empezado,
    // 3) mercados automáticos abiertos para reprogramar.
    type OpenMarket = {
      id: string
      closesAt: Date
      match: { date: Date } | null
    }
    const runWith = async ({
      byTime = [] as { id: string }[],
      byMatchStarted = [] as { id: string }[],
      open = [] as OpenMarket[],
    }) => {
      mockPrisma.market.findMany
        .mockResolvedValueOnce(byTime)
        .mockResolvedValueOnce(byMatchStarted)
        .mockResolvedValueOnce(open)
      await service.handleMarketLocking()
    }

    it('Debe bloquear cada mercado con update condicional y emitir LOCKED solo si lo bloqueó', async () => {
      // market-2 lo liquidaron entre la lectura y el update
      mockPrisma.market.updateMany
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 })

      await runWith({ byTime: [{ id: 'market-1' }, { id: 'market-2' }] })

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

    it('Debe cerrar primero Redis (corta las apuestas) y después la base', async () => {
      const order: string[] = []
      mockRedisService.redis.eval.mockImplementation(() => {
        order.push('redis')
        return Promise.resolve(1)
      })
      mockPrisma.market.updateMany.mockImplementation(() => {
        order.push('db')
        return Promise.resolve({ count: 1 })
      })

      await runWith({ byTime: [{ id: 'market-1' }] })

      expect(order).toEqual(['redis', 'db'])
      expect(mockRedisService.redis.eval).toHaveBeenCalledWith(
        expect.stringContaining("'LOCKED'"),
        1,
        'market:market-1',
      )
    })

    it('Debe cerrar un mercado automático cuyo partido ya empezó aunque falte para el cierre', async () => {
      mockPrisma.market.updateMany.mockResolvedValue({ count: 1 })

      await runWith({ byMatchStarted: [{ id: 'market-adelantado' }] })

      const startedQuery = firstArg(mockPrisma.market.findMany, 1)
      expect(startedQuery.where).toEqual({
        status: 'OPEN',
        isManual: false,
        match: { status_short: { notIn: ['NS', 'TBD'] } },
      })
      expect(mockPrisma.market.updateMany).toHaveBeenCalledWith({
        where: { id: 'market-adelantado', status: 'OPEN' },
        data: { status: 'LOCKED' },
      })
    })

    it('Un error al cerrar un mercado no debe dejar abiertos a los demás', async () => {
      mockRedisService.redis.eval
        .mockRejectedValueOnce(new Error('Redis caído'))
        .mockResolvedValue(1)
      mockPrisma.market.updateMany.mockResolvedValue({ count: 1 })

      await runWith({ byTime: [{ id: 'market-1' }, { id: 'market-2' }] })

      expect(mockPrisma.market.updateMany).toHaveBeenCalledWith({
        where: { id: 'market-2', status: 'OPEN' },
        data: { status: 'LOCKED' },
      })
    })

    it('No debe cerrar dos veces un mercado que aparece por hora y por partido empezado', async () => {
      mockPrisma.market.updateMany.mockResolvedValue({ count: 1 })

      await runWith({
        byTime: [{ id: 'market-1' }],
        byMatchStarted: [{ id: 'market-1' }],
      })

      expect(mockPrisma.market.updateMany).toHaveBeenCalledTimes(1)
    })

    it('Debe recalcular el cierre si el partido se reprogramó para más tarde', async () => {
      const kickoff = new Date(Date.now() + 3 * 60 * 60 * 1000)
      mockPrisma.market.updateMany.mockResolvedValue({ count: 1 })

      await runWith({
        open: [
          {
            id: 'market-1',
            closesAt: new Date(Date.now() + 60 * 60 * 1000),
            match: { date: kickoff },
          },
        ],
      })

      const expected = new Date(kickoff.getTime() - 5 * 60 * 1000)
      expect(mockRedisService.redis.eval).toHaveBeenCalledWith(
        expect.stringContaining("'closesAt'"),
        1,
        'market:market-1',
        expected.getTime().toString(),
      )
      expect(mockPrisma.market.updateMany).toHaveBeenCalledWith({
        where: { id: 'market-1', status: 'OPEN' },
        data: { closesAt: expected },
      })
    })

    it('Debe cerrar el mercado si el partido se adelantó y ya pasó la nueva hora de cierre', async () => {
      mockPrisma.market.updateMany.mockResolvedValue({ count: 1 })

      await runWith({
        open: [
          {
            id: 'market-1',
            closesAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
            match: { date: new Date(Date.now() + 2 * 60 * 1000) },
          },
        ],
      })

      expect(mockPrisma.market.updateMany).toHaveBeenCalledWith({
        where: { id: 'market-1', status: 'OPEN' },
        data: { status: 'LOCKED' },
      })
    })

    it('No debe tocar un mercado cuyo cierre ya coincide con la fecha del partido', async () => {
      const kickoff = new Date(Date.now() + 3 * 60 * 60 * 1000)

      await runWith({
        open: [
          {
            id: 'market-1',
            closesAt: new Date(kickoff.getTime() - 5 * 60 * 1000),
            match: { date: kickoff },
          },
        ],
      })

      expect(mockRedisService.redis.eval).not.toHaveBeenCalled()
      expect(mockPrisma.market.updateMany).not.toHaveBeenCalled()
    })

    it('Solo debe reprogramar mercados automáticos vinculados a un partido', async () => {
      await runWith({})

      expect(firstArg(mockPrisma.market.findMany, 2).where).toEqual({
        status: 'OPEN',
        isManual: false,
        matchId: { not: null },
      })
    })

    it('No debe escribir nada si no hay mercados para bloquear ni reprogramar', async () => {
      await runWith({})

      expect(mockPrisma.market.updateMany).not.toHaveBeenCalled()
      expect(mockRedisService.redis.eval).not.toHaveBeenCalled()
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
            OR: [{ matchId: { not: null } }, { fixtureId: { not: null } }],
          },
        }),
      )
      expect(mockPrisma.matches.findMany).toHaveBeenCalledTimes(1)
      expect(mockPrisma.matches.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [{ id: { in: [] } }, { api_fixture_id: { in: [100, 200] } }],
          },
        }),
      )
    })

    it('Debe liquidar por matchId un mercado de un partido sin ID de API-Football', async () => {
      await runWith(
        [buildMatch(null as unknown as number, 'FT', 2, 1, 'match-sin-api')],
        [buildMarket('market-1', null, 'match-sin-api')],
      )

      expect(mockPrisma.matches.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { id: { in: ['match-sin-api'] } },
              { api_fixture_id: { in: [] } },
            ],
          },
        }),
      )
      expect(mockBetsService.settleMarket).toHaveBeenCalledWith('market-1', {
        status: 'SETTLED',
        winningOptionId: 'market-1-home',
      })
    })

    it('Con matchId debe usar ese partido aunque otro tenga el mismo fixtureId', async () => {
      await runWith(
        [
          buildMatch(100, 'FT', 0, 2, 'match-correcto'),
          buildMatch(100, 'FT', 3, 0, 'match-viejo'),
        ],
        [buildMarket('market-1', 100, 'match-correcto')],
      )

      expect(mockBetsService.settleMarket).toHaveBeenCalledWith('market-1', {
        status: 'SETTLED',
        winningOptionId: 'market-1-away',
      })
    })

    it('Debe reembolsar si el partido volvió a NS con una fecha nueva lejos del cierre', async () => {
      const reprogramado = buildMatch(
        100,
        'NS',
        null,
        null,
        'match-100',
        new Date('2026-10-23T20:00:00.000Z'),
      )

      await runWith([reprogramado])

      expect(mockBetsService.settleMarket).toHaveBeenCalledWith('market-1', {
        status: 'REFUNDED',
      })
    })

    it('No debe reembolsar un partido sin empezar que solo se demoró unos minutos', async () => {
      const demorado = buildMatch(
        100,
        'NS',
        null,
        null,
        'match-100',
        new Date('2026-10-20T20:20:00.000Z'),
      )

      await runWith([demorado])

      expect(mockBetsService.settleMarket).not.toHaveBeenCalled()
    })

    it('Debe reembolsar el mercado si el partido se postergó (PST)', async () => {
      await runWith([buildMatch(100, 'PST', null, null)])

      expect(mockBetsService.settleMarket).toHaveBeenCalledWith('market-1', {
        status: 'REFUNDED',
      })
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
