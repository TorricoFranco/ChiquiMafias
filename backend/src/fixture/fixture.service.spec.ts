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

// Zona de 8 equipos llamados por zona y posición: `A1`, `A2`…
const zone = (name: string) =>
  Array.from({ length: 8 }, (_, i) => ({
    position: i + 1,
    teamName: `${name}${i + 1}`,
    teamLogo: null,
  }))

const playoffMatch = (
  id: string,
  round: string,
  home: string,
  away: string,
  date = '2026-11-14T20:00:00.000Z',
) => ({
  id,
  round,
  status_short: 'FT',
  home_goals: 1,
  away_goals: 0,
  home_penalty_goals: null,
  away_penalty_goals: null,
  date: new Date(date),
  home_team: { name: home, logo_url: null },
  away_team: { name: away, logo_url: null },
})

describe('FixtureService', () => {
  const prisma = {
    matches: { findMany: jest.fn(), count: jest.fn() },
  }
  const redis = { get: jest.fn(), set: jest.fn(), hgetall: jest.fn() }
  const standings = { getStandings: jest.fn() }
  let service: FixtureService

  beforeEach(() => {
    jest.clearAllMocks()
    prisma.matches.findMany.mockResolvedValue([])
    prisma.matches.count.mockResolvedValue(0)
    redis.get.mockResolvedValue(null)
    redis.hgetall.mockResolvedValue({})
    standings.getStandings.mockResolvedValue({
      apertura: { groups: { A: [], B: [] } },
      clausura: { groups: { A: zone('A'), B: zone('B') } },
    })
    service = new FixtureService(
      prisma as never,
      { redis } as never,
      standings as never,
    )
  })

  describe('getActiveMatchdayInfo', () => {
    const match = (round: string, date: string, status_short = 'FT') => ({
      round,
      date: new Date(date),
      status_short,
    })

    it('Debe terminar en la final cuando ya se jugó todo el torneo', async () => {
      prisma.matches.findMany.mockResolvedValue([
        match('Regular Season - 16', '2026-04-25T20:00:00.000Z'),
        match('Regular Season - octavos', '2026-05-09T20:00:00.000Z'),
        match('Regular Season - cuartos', '2026-05-12T20:00:00.000Z'),
        match('Regular Season - semifinal', '2026-05-16T20:00:00.000Z'),
        match('Regular Season - final', '2026-05-24T20:00:00.000Z'),
      ])

      await expect(
        service.getActiveMatchdayInfo(liga, 'APERTURA'),
      ).resolves.toBe('final')
    })

    it('Debe mostrar la semifinal pendiente aunque la final ya esté cargada', async () => {
      prisma.matches.findMany.mockResolvedValue([
        match('Clausura - cuartos', '2020-11-20T20:00:00.000Z'),
        match('Clausura - final', '2999-12-20T20:00:00.000Z', 'NS'),
        match('Clausura - semifinal', '2999-12-13T20:00:00.000Z', 'NS'),
      ])

      await expect(
        service.getActiveMatchdayInfo(liga, 'CLAUSURA'),
      ).resolves.toBe('semifinal')
    })
  })

  describe('getTournamentBrackets', () => {
    it('Debe proyectar los octavos con la tabla del torneo, sin caché propia', async () => {
      const { brackets } = await service.getTournamentBrackets(liga, 'CLAUSURA')

      expect(standings.getStandings).toHaveBeenCalledWith(liga)
      expect(redis.set).not.toHaveBeenCalled()
      expect(brackets.octavos[0]).toMatchObject({
        side: 'left',
        position: 0,
        home_team: { name: 'A1' },
        away_team: { name: 'B8' },
      })
    })

    it('Debe ubicar los octavos reales aunque la tabla desempate distinto', async () => {
      // La AFA dejó 4.º al 5.º de la tabla del proveedor en la zona A.
      prisma.matches.findMany.mockResolvedValue([
        playoffMatch('real-left-1', 'Clausura - octavos', 'B4', 'A4'),
        playoffMatch('real-right-1', 'Clausura - octavos', 'A5', 'B5'),
        playoffMatch('real-left-0', 'Clausura - octavos', 'A1', 'B8'),
        playoffMatch('cuartos-left-0', 'Clausura - cuartos', 'A1', 'A4'),
      ])

      const { brackets } = await service.getTournamentBrackets(liga, 'CLAUSURA')

      const slot = (side: string, position: number) =>
        brackets.octavos.find((m) => m.side === side && m.position === position)
          ?.id
      expect(slot('left', 0)).toBe('real-left-0')
      expect(slot('left', 1)).toBe('real-left-1')
      expect(slot('right', 1)).toBe('real-right-1')
      expect(brackets.cuartos[0]).toMatchObject({
        id: 'cuartos-left-0',
        side: 'left',
        position: 0,
      })
    })

    it('Sin tabla debe mostrar igual los octavos reales en los cruces libres', async () => {
      standings.getStandings.mockResolvedValue({
        apertura: { groups: { A: [], B: [] } },
        clausura: { groups: { A: [], B: [] } },
      })
      prisma.matches.findMany.mockResolvedValue([
        playoffMatch('real', 'Clausura - octavos', 'Boca', 'River'),
      ])

      const { brackets } = await service.getTournamentBrackets(liga, 'CLAUSURA')

      expect(brackets.octavos[0]).toMatchObject({
        id: 'real',
        home_team: { name: 'Boca' },
      })
      expect(brackets.octavos[1].home_team.name).toBe('Por definir (4B)')
    })
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
