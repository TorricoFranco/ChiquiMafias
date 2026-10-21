import { FixturesSyncCron } from './fixtures-sync.cron'
import { FootballFixture } from '../football.types'

const fixture: FootballFixture = {
  externalId: 5001,
  date: '2026-10-25T20:00:00.000Z',
  timestamp: 1793000000,
  timezone: 'UTC',
  referee: null,
  venue: null,
  status: { short: 'NS', long: 'Not started', elapsed: null },
  league: { externalId: 109712, season: 2026, round: 'Clausura - 14' },
  home: { externalId: 1, name: 'Local', winner: null },
  away: { externalId: 2, name: 'Visita', winner: null },
  goals: { home: null, away: null },
  penalty: { home: null, away: null },
}

describe('FixturesSyncCron', () => {
  const prisma = {
    leagues: { findUnique: jest.fn() },
    matches: {
      upsert: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    venues: { findUnique: jest.fn(), findFirst: jest.fn() },
    $transaction: jest.fn(),
  }
  const redis = { redis: { del: jest.fn() } }
  const provider = { getFixtures: jest.fn() }
  const refs = {
    usesLegacyColumns: true,
    providerName: 'api-football',
    leagueExternalId: jest.fn(),
    resolveTeam: jest.fn(),
    findInternalId: jest.fn(),
    link: jest.fn(),
  }
  let cron: FixturesSyncCron

  beforeEach(() => {
    jest.clearAllMocks()
    refs.usesLegacyColumns = true
    prisma.$transaction.mockImplementation((cb: (tx: unknown) => unknown) =>
      Promise.resolve(cb(prisma)),
    )
    prisma.matches.findFirst.mockResolvedValue(null)
    prisma.leagues.findUnique.mockResolvedValue({ id: 'league-1', name: 'LPA' })
    refs.leagueExternalId.mockResolvedValue(128)
    refs.resolveTeam.mockImplementation((_c: unknown, t: { name: string }) =>
      Promise.resolve({ id: `team-${t.name}`, name: t.name }),
    )
    provider.getFixtures.mockResolvedValue([fixture])
    cron = new FixturesSyncCron(
      prisma as never,
      provider as never,
      redis as never,
      refs as never,
    )
  })

  it('Debe pedir los partidos con el ID de la liga del proveedor activo', async () => {
    prisma.matches.upsert.mockResolvedValue({
      id: 'm1',
      tournament: 'CLAUSURA',
      api_fixture_id: 5001,
    })
    refs.leagueExternalId.mockResolvedValue(109712)

    await cron.handle()

    expect(provider.getFixtures).toHaveBeenCalledWith(
      expect.objectContaining({ leagueExternalId: 109712, season: 2026 }),
    )
  })

  it('Con API-Football debe hacer upsert por api_fixture_id', async () => {
    prisma.matches.upsert.mockResolvedValue({
      id: 'm1',
      tournament: 'CLAUSURA',
      api_fixture_id: 5001,
    })

    await cron.handle()

    expect(prisma.matches.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { api_fixture_id: 5001 },
        create: expect.objectContaining({
          api_fixture_id: 5001,
          league_id: 'league-1',
          home_team_id: 'team-Local',
        }),
      }),
    )
    expect(refs.link).not.toHaveBeenCalled()
  })

  it('Con otro proveedor debe actualizar el partido ya vinculado', async () => {
    refs.usesLegacyColumns = false
    refs.findInternalId.mockResolvedValue('m-existing')
    refs.link.mockResolvedValue('m-existing')
    prisma.matches.update.mockResolvedValue({
      id: 'm-existing',
      tournament: 'CLAUSURA',
      api_fixture_id: 123,
    })

    await cron.handle()

    expect(prisma.matches.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'm-existing' } }),
    )
    expect(prisma.matches.create).not.toHaveBeenCalled()
    expect(prisma.matches.upsert).not.toHaveBeenCalled()
  })

  it('Con otro proveedor debe vincular un partido existente por local, visitante y ronda en vez de duplicarlo', async () => {
    refs.usesLegacyColumns = false
    refs.findInternalId.mockResolvedValue(null)
    prisma.matches.findFirst.mockResolvedValue({ id: 'm-sin-vinculo' })
    refs.link.mockResolvedValue('m-sin-vinculo')
    prisma.matches.update.mockResolvedValue({
      id: 'm-sin-vinculo',
      tournament: 'CLAUSURA',
      api_fixture_id: 77,
    })

    await cron.handle()

    expect(prisma.matches.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          league_id: 'league-1',
          home_team_id: 'team-Local',
          away_team_id: 'team-Visita',
        }) as unknown,
      }),
    )
    expect(refs.link).toHaveBeenCalledWith('MATCH', 'm-sin-vinculo', 5001)
    expect(prisma.matches.create).not.toHaveBeenCalled()
  })

  it('Con otro proveedor debe crear el partido sin api_fixture_id y vincularlo en la misma transacción', async () => {
    refs.usesLegacyColumns = false
    refs.findInternalId.mockResolvedValue(null)
    prisma.matches.create.mockResolvedValue({
      id: 'm-new',
      tournament: 'CLAUSURA',
      api_fixture_id: null,
    })
    refs.link.mockResolvedValue('m-new')

    await cron.handle()

    const data = (
      prisma.matches.create.mock.calls[0] as [{ data: Record<string, unknown> }]
    )[0].data
    expect(data).not.toHaveProperty('api_fixture_id')
    expect(data).toMatchObject({
      league_id: 'league-1',
      home_team_id: 'team-Local',
    })
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(refs.link).toHaveBeenCalledWith('MATCH', 'm-new', 5001, prisma)
    expect(prisma.matches.delete).not.toHaveBeenCalled()
  })

  it('Con otro proveedor debe descartar el partido creado si otro cron lo vinculó antes', async () => {
    refs.usesLegacyColumns = false
    refs.findInternalId.mockResolvedValue(null)
    prisma.matches.create.mockResolvedValue({
      id: 'm-mio',
      tournament: 'CLAUSURA',
      api_fixture_id: null,
    })
    refs.link.mockResolvedValue('m-otro')
    prisma.matches.findUniqueOrThrow.mockResolvedValue({
      id: 'm-otro',
      tournament: 'CLAUSURA',
      api_fixture_id: null,
    })

    await cron.handle()

    expect(prisma.matches.delete).toHaveBeenCalledWith({
      where: { id: 'm-mio' },
    })
    expect(prisma.matches.findUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'm-otro' } }),
    )
  })

  it('Debe saltear el partido si un equipo no está vinculado', async () => {
    refs.resolveTeam.mockResolvedValueOnce(null)

    await cron.handle()

    expect(prisma.matches.upsert).not.toHaveBeenCalled()
    expect(prisma.matches.create).not.toHaveBeenCalled()
  })

  it('Debe saltear la sincronización si la liga no tiene ID en el proveedor', async () => {
    refs.leagueExternalId.mockResolvedValue(null)

    await cron.handle()

    expect(provider.getFixtures).not.toHaveBeenCalled()
  })
})
