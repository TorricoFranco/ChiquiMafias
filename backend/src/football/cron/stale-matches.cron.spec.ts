import { Logger } from '@nestjs/common'
import { StaleMatchesCron } from './stale-matches.cron'
import { MATCH_FINISHED_EVENT } from '../football.events'
import { FootballFixture } from '../football.types'

const league = { id: 'league-1', name: 'LPA', api_league_id: 128 }

const staleMatch = (over: Record<string, unknown> = {}) => ({
  id: 'm1',
  date: new Date('2026-10-11T20:00:00.000Z'),
  round: 'Clausura - 12',
  season: 2026,
  status: 'SCHEDULED',
  status_short: 'NS',
  league_id: 'league-1',
  league,
  home_team: { name: 'Racing' },
  away_team: { name: 'Belgrano' },
  markets: [] as { status: string }[],
  ...over,
})

const fixture = (
  externalId: number,
  short: string,
  goals: [number | null, number | null] = [1, 0],
) =>
  ({
    externalId,
    date: '2026-10-11T20:00:00.000Z',
    timestamp: 1_791_000_000,
    status: { short, long: short, elapsed: short === 'FT' ? 90 : null },
    goals: { home: goals[0], away: goals[1] },
    penalty: { home: null, away: null },
  }) as unknown as FootballFixture

describe('StaleMatchesCron', () => {
  const prisma = {
    matches: { findMany: jest.fn(), updateMany: jest.fn() },
    competitionSeason: { findMany: jest.fn() },
  }
  const redis = { redis: { set: jest.fn(), del: jest.fn(), scan: jest.fn() } }
  const provider = { getFixtures: jest.fn() }
  const refs = {
    providerName: 'highlightly',
    leagueExternalId: jest.fn(),
    findInternalId: jest.fn(),
  }
  const eventEmitter = { emit: jest.fn() }
  let cron: StaleMatchesCron
  let warn: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {})
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {})
    prisma.matches.findMany.mockResolvedValue([staleMatch()])
    prisma.matches.updateMany.mockResolvedValue({ count: 1 })
    prisma.competitionSeason.findMany.mockResolvedValue([
      { league_id: 'league-1', season: 2026 },
    ])
    redis.redis.set.mockResolvedValue('OK')
    redis.redis.del.mockResolvedValue(1)
    redis.redis.scan.mockResolvedValue([
      '0',
      ['fixtures:128:2026:CLAUSURA:fecha:12'],
    ])
    refs.leagueExternalId.mockResolvedValue(109712)
    refs.findInternalId.mockImplementation((_e: string, id: number) =>
      Promise.resolve(id === 77 ? 'm1' : id === 88 ? 'm2' : null),
    )
    provider.getFixtures.mockResolvedValue([fixture(77, 'FT')])
    cron = new StaleMatchesCron(
      prisma as never,
      provider as never,
      redis as never,
      refs as never,
      eventEmitter as never,
    )
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('Debe corregir un partido congelado con el resultado del proveedor', async () => {
    await cron.handle()

    expect(provider.getFixtures).toHaveBeenCalledWith({
      leagueExternalId: 109712,
      season: 2026,
      from: '2026-10-10',
      to: '2026-10-12',
      includeDetails: false,
    })
    expect(prisma.matches.updateMany).toHaveBeenCalledWith({
      where: { id: 'm1', status: { in: ['SCHEDULED', 'LIVE', 'SUSPENDED'] } },
      data: expect.objectContaining({
        status: 'FINISHED',
        status_short: 'FT',
        home_goals: 1,
        away_goals: 0,
      }) as unknown,
    })
    expect(redis.redis.del).toHaveBeenCalledWith('match:details:v2:m1')
    expect(redis.redis.del).toHaveBeenCalledWith(
      'fixtures:128:2026:CLAUSURA:fecha:12',
    )
  })

  it('Debe avisar que terminó un partido para recalcular la tabla', async () => {
    await cron.handle()

    expect(eventEmitter.emit).toHaveBeenCalledWith(MATCH_FINISHED_EVENT, {
      leagueId: 128,
      leagueDbId: 'league-1',
      season: 2026,
    })
  })

  it('Debe emitir una sola vez aunque se corrijan varios partidos de la competición', async () => {
    prisma.matches.findMany.mockResolvedValue([
      staleMatch(),
      staleMatch({ id: 'm2' }),
    ])
    provider.getFixtures.mockResolvedValue([
      fixture(77, 'FT'),
      fixture(88, 'FT'),
    ])

    await cron.handle()

    expect(prisma.matches.updateMany).toHaveBeenCalledTimes(2)
    expect(eventEmitter.emit).toHaveBeenCalledTimes(1)
  })

  it('No debe consultar al proveedor si no hay partidos congelados', async () => {
    prisma.matches.findMany.mockResolvedValue([])

    await cron.handle()

    expect(prisma.competitionSeason.findMany).not.toHaveBeenCalled()
    expect(provider.getFixtures).not.toHaveBeenCalled()
  })

  it('Debe saltear las competiciones que no se sincronizan', async () => {
    prisma.competitionSeason.findMany.mockResolvedValue([])

    await cron.handle()

    expect(provider.getFixtures).not.toHaveBeenCalled()
  })

  it('No debe volver a consultar una competición antes del plazo', async () => {
    redis.redis.set.mockResolvedValue(null)

    await cron.handle()

    expect(redis.redis.set).toHaveBeenCalledWith(
      'stale-matches:league-1:2026',
      '1',
      'EX',
      1800,
      'NX',
    )
    expect(provider.getFixtures).not.toHaveBeenCalled()
  })

  it('No debe pisar un partido que el cron en vivo cambió mientras tanto', async () => {
    prisma.matches.updateMany.mockResolvedValue({ count: 0 })

    await cron.handle()

    expect(redis.redis.del).not.toHaveBeenCalled()
    expect(eventEmitter.emit).not.toHaveBeenCalled()
  })

  it('Debe avisar una sola vez de un partido que el proveedor tampoco da por terminado', async () => {
    provider.getFixtures.mockResolvedValue([fixture(77, 'NS', [null, null])])

    await cron.handle()
    await cron.handle()

    expect(prisma.matches.updateMany).not.toHaveBeenCalled()
    expect(eventEmitter.emit).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Racing vs Belgrano') as unknown,
    )
  })

  it('Debe corregir un partido postergado sin emitir que terminó', async () => {
    provider.getFixtures.mockResolvedValue([fixture(77, 'PST', [null, null])])

    await cron.handle()

    expect(prisma.matches.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'POSTPONED' }) as unknown,
      }),
    )
    expect(eventEmitter.emit).not.toHaveBeenCalled()
  })

  it('Debe avisar si la competición no tiene ID en el proveedor', async () => {
    refs.leagueExternalId.mockResolvedValue(null)

    await cron.handle()

    expect(provider.getFixtures).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('No debe corregir un partido terminado sin marcador para no liquidar con un 0-0 falso', async () => {
    provider.getFixtures.mockResolvedValue([fixture(77, 'FT', [null, null])])

    await cron.handle()
    await cron.handle()

    expect(prisma.matches.updateMany).not.toHaveBeenCalled()
    expect(eventEmitter.emit).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('sin marcador') as unknown,
    )
  })

  it('Debe buscar también los partidos suspendidos para poder recuperarlos', async () => {
    await cron.handle()

    expect(prisma.matches.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ['SCHEDULED', 'LIVE', 'SUSPENDED'] },
        }) as unknown,
      }),
    )
  })

  it('Si falla el proveedor, debe liberar el reclamo para reintentar en la próxima corrida', async () => {
    provider.getFixtures.mockRejectedValue(new Error('Proveedor caído'))

    await cron.handle()

    expect(redis.redis.del).toHaveBeenCalledWith('stale-matches:league-1:2026')
    expect(prisma.matches.updateMany).not.toHaveBeenCalled()
  })

  it('Un error en una competición no debe cortar a las demás', async () => {
    const other = { ...league, id: 'league-2', api_league_id: null }
    prisma.matches.findMany.mockResolvedValue([
      staleMatch({ id: 'm9', league_id: 'league-2', league: other }),
      staleMatch(),
    ])
    prisma.competitionSeason.findMany.mockResolvedValue([
      { league_id: 'league-1', season: 2026 },
      { league_id: 'league-2', season: 2026 },
    ])
    provider.getFixtures
      .mockRejectedValueOnce(new Error('Proveedor caído'))
      .mockResolvedValueOnce([fixture(77, 'FT')])

    await cron.handle()

    expect(provider.getFixtures).toHaveBeenCalledTimes(2)
    expect(prisma.matches.updateMany).toHaveBeenCalledTimes(1)
  })
})
