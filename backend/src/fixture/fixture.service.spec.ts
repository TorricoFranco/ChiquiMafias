import { BadRequestException } from '@nestjs/common'
import { CompetitionContext } from 'src/competitions/competitions.service'
import { FixtureService, MATCHES_PAGE_SIZE } from './fixture.service'

const liga = {
  leagueId: 'league-liga',
  slug: 'liga-profesional',
  season: 2026,
  cacheKey: 128,
} as CompetitionContext

const copa = {
  leagueId: 'league-copa',
  slug: 'copa-argentina',
  season: 2026,
  cacheKey: 'league-copa',
} as CompetitionContext

describe('FixtureService', () => {
  const prisma = {
    matches: { findMany: jest.fn(), count: jest.fn() },
  }
  const redis = { get: jest.fn(), set: jest.fn(), hgetall: jest.fn() }
  let service: FixtureService

  beforeEach(() => {
    jest.clearAllMocks()
    prisma.matches.findMany.mockResolvedValue([])
    prisma.matches.count.mockResolvedValue(0)
    redis.get.mockResolvedValue(null)
    redis.hgetall.mockResolvedValue({})
    service = new FixtureService(prisma as never, { redis } as never)
  })

  describe('getMatches', () => {
    it('Debe filtrar por competición, temporada y rango, de a una página', async () => {
      prisma.matches.count.mockResolvedValue(120)

      const result = await service.getMatches(copa, {
        from: '2026-10-01',
        to: '2026-10-31',
        page: 2,
      })

      const where = {
        league_id: 'league-copa',
        season: 2026,
        date: {
          gte: new Date('2026-10-01T00:00:00.000Z'),
          lt: new Date('2026-11-01T00:00:00.000Z'),
        },
      }
      expect(prisma.matches.count).toHaveBeenCalledWith({ where })
      expect(prisma.matches.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where,
          skip: MATCHES_PAGE_SIZE,
          take: MATCHES_PAGE_SIZE,
        }),
      )
      expect(redis.hgetall).toHaveBeenCalledWith(
        'live_scores:league:league-copa',
      )
      expect(result).toEqual({
        page: 2,
        pageSize: MATCHES_PAGE_SIZE,
        total: 120,
        matches: [],
      })
    })

    it('Debe filtrar por ronda sin exigir fechas', async () => {
      await service.getMatches(copa, { round: 'Round of 64' })

      expect(prisma.matches.count).toHaveBeenCalledWith({
        where: { league_id: 'league-copa', season: 2026, round: 'Round of 64' },
      })
    })

    it('Sin filtros debe ir de una semana atrás a dos adelante', async () => {
      jest.useFakeTimers({ now: new Date('2026-10-22T15:00:00.000Z') })

      await service.getMatches(liga, {})

      expect(prisma.matches.count).toHaveBeenCalledWith({
        where: {
          league_id: 'league-liga',
          season: 2026,
          date: {
            gte: new Date('2026-10-15T00:00:00.000Z'),
            lt: new Date('2026-11-06T00:00:00.000Z'),
          },
        },
      })
      jest.useRealTimers()
    })

    it.each([
      [{ from: '2026-10-01' }, 'juntos'],
      [{ from: '2026-10-10', to: '2026-10-01' }, 'anterior'],
      [{ from: '2026-01-01', to: '2026-03-01' }, '31 días'],
    ])('Debe rechazar el rango %j', async (filters, message) => {
      await expect(service.getMatches(liga, filters)).rejects.toThrow(
        BadRequestException,
      )
      await expect(service.getMatches(liga, filters)).rejects.toThrow(message)
      expect(prisma.matches.findMany).not.toHaveBeenCalled()
    })

    it('Debe aceptar un rango de 31 días justos', async () => {
      await expect(
        service.getMatches(liga, { from: '2026-10-01', to: '2026-10-31' }),
      ).resolves.toBeDefined()
    })
  })

  describe('nunca mezcla competiciones (RF-A03)', () => {
    it('El calendario debe filtrar por la liga y usar su clave', async () => {
      await service.getYearlyCalendar(copa)

      expect(redis.get).toHaveBeenCalledWith('calendar:league-copa:2026:full')
      expect(prisma.matches.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { league_id: 'league-copa', season: 2026 },
        }),
      )
    })

    it('La fecha de la Liga debe usar la clave de siempre y filtrar por liga', async () => {
      await service.getFixtureByMatchday(liga, 'CLAUSURA', '14')

      expect(redis.get).toHaveBeenCalledWith(
        'fixtures:128:2026:CLAUSURA:fecha:14',
      )
      expect(prisma.matches.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            league_id: 'league-liga',
            season: 2026,
          }) as unknown,
        }),
      )
    })

    it('La fecha activa y las fases disponibles deben filtrar por liga', async () => {
      await service.getActiveMatchdayInfo(liga, 'CLAUSURA')
      await service.getAvailableStages(liga, 'CLAUSURA')

      for (const call of prisma.matches.findMany.mock.calls as [
        { where: Record<string, unknown> },
      ][]) {
        expect(call[0].where).toMatchObject({
          league_id: 'league-liga',
          season: 2026,
        })
      }
    })

    it('Los pendientes deben usar la liga resuelta, no un uuid fijo', async () => {
      await service.getPendingFixtures(copa, 'CLAUSURA')

      expect(prisma.matches.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            league_id: 'league-copa',
          }) as unknown,
        }),
      )
    })
  })
})
