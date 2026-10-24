import { FixturesSyncCron } from './fixtures-sync.cron'
import { FootballFixture } from '../football.types'

const NOW = new Date('2026-10-22T15:00:00.000Z')

const ligaSeason = (over: Record<string, unknown> = {}) => ({
  id: 'season-liga',
  league_id: 'league-1',
  season: 2026,
  label: '2026',
  format: 'LIGA_DIVIDIDA',
  fixtures_sync_minutes: 10,
  last_fixtures_sync_at: null as Date | null,
  league: { id: 'league-1', name: 'LPA', api_league_id: 128 },
  ...over,
})

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
    competitionSeason: { findMany: jest.fn(), updateMany: jest.fn() },
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
  const eventEmitter = { emit: jest.fn() }
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
    jest.useFakeTimers({ now: NOW })
    prisma.competitionSeason.findMany.mockResolvedValue([ligaSeason()])
    prisma.competitionSeason.updateMany.mockResolvedValue({ count: 1 })
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
      eventEmitter as never,
    )
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('Debe pedir los partidos con el ID de la liga del proveedor activo', async () => {
    prisma.matches.upsert.mockResolvedValue({
      id: 'm1',
      tournament: 'CLAUSURA',
      api_fixture_id: 5001,
    })
    refs.leagueExternalId.mockResolvedValue(109712)

    await cron.handle()

    expect(provider.getFixtures).toHaveBeenCalledWith({
      leagueExternalId: 109712,
      season: 2026,
      from: '2026-10-12',
      to: '2026-10-29',
    })
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

  it('No debe pisar el estadio ni el árbitro con null al actualizar', async () => {
    prisma.matches.upsert.mockResolvedValue({
      id: 'm1',
      tournament: 'CLAUSURA',
      api_fixture_id: 5001,
    })
    // fixture sin árbitro y sin estadio (venue: null -> venueId null)

    await cron.handle()

    const call = (
      prisma.matches.upsert.mock.calls[0] as [
        { update: Record<string, unknown>; create: Record<string, unknown> },
      ]
    )[0]
    expect(call.update).not.toHaveProperty('venue_id')
    expect(call.update).not.toHaveProperty('referee')
    // al crear sí se guardan (null) para que la fila exista completa
    expect(call.create).toHaveProperty('referee', null)
  })

  it('Debe actualizar el árbitro cuando el proveedor lo informa', async () => {
    provider.getFixtures.mockResolvedValue([
      { ...fixture, referee: 'Pérez, Juan' },
    ])
    prisma.matches.upsert.mockResolvedValue({
      id: 'm1',
      tournament: 'CLAUSURA',
      api_fixture_id: 5001,
    })

    await cron.handle()

    const call = (
      prisma.matches.upsert.mock.calls[0] as [
        { update: Record<string, unknown> },
      ]
    )[0]
    expect(call.update).toHaveProperty('referee', 'Pérez, Juan')
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

  describe('temporadas', () => {
    it('Debe recorrer solo las temporadas con sync_enabled', async () => {
      await cron.handle()

      expect(prisma.competitionSeason.findMany).toHaveBeenCalledWith({
        where: { sync_enabled: true },
        include: { league: true },
      })
    })

    it('Debe avisar que sincronizó la temporada para rearmar el cuadro', async () => {
      prisma.matches.upsert.mockResolvedValue({ id: 'm1' })

      await cron.handle()

      expect(eventEmitter.emit).toHaveBeenCalledWith('fixtures.synced', {
        seasonId: 'season-liga',
      })
    })

    it('No debe avisar si la sincronización falló', async () => {
      provider.getFixtures.mockRejectedValue(new Error('Proveedor caído'))

      await cron.handle()

      expect(eventEmitter.emit).not.toHaveBeenCalled()
    })

    it('Debe reclamar la temporada antes de sincronizarla', async () => {
      prisma.matches.upsert.mockResolvedValue({ id: 'm1' })

      await cron.handle()

      expect(prisma.competitionSeason.updateMany).toHaveBeenCalledWith({
        where: { id: 'season-liga', last_fixtures_sync_at: null },
        data: { last_fixtures_sync_at: NOW },
      })
      expect(provider.getFixtures).toHaveBeenCalledTimes(1)
    })

    it('No debe sincronizar si otro tick ya reclamó la temporada', async () => {
      prisma.competitionSeason.updateMany.mockResolvedValue({ count: 0 })

      await cron.handle()

      expect(provider.getFixtures).not.toHaveBeenCalled()
    })

    it('Debe respetar la frecuencia de cada temporada', async () => {
      prisma.matches.upsert.mockResolvedValue({ id: 'm1' })
      prisma.competitionSeason.findMany.mockResolvedValue([
        // Hace 5 minutos, cada 10: no le toca.
        ligaSeason({
          last_fixtures_sync_at: new Date(NOW.getTime() - 5 * 60_000),
        }),
        // Hace 10 minutos (con el atraso del scheduler), cada 10: le toca.
        ligaSeason({
          id: 'season-b',
          last_fixtures_sync_at: new Date(NOW.getTime() - 9.8 * 60_000),
          league: { id: 'league-b', name: 'B Nacional', api_league_id: null },
        }),
        // Una vez por día, sincronizada hace 2 horas: no le toca.
        ligaSeason({
          id: 'season-diaria',
          fixtures_sync_minutes: 1440,
          last_fixtures_sync_at: new Date(NOW.getTime() - 120 * 60_000),
        }),
      ])

      await cron.handle()

      expect(prisma.competitionSeason.updateMany).toHaveBeenCalledTimes(1)
      expect(prisma.competitionSeason.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'season-b' }) as unknown,
        }),
      )
      expect(provider.getFixtures).toHaveBeenCalledTimes(1)
    })

    it('Debe usar el uuid como clave de caché de una competición sin ID de API-Football', async () => {
      prisma.competitionSeason.findMany.mockResolvedValue([
        ligaSeason({
          id: 'season-b',
          league: { id: 'league-b', name: 'B Nacional', api_league_id: null },
        }),
      ])
      prisma.matches.upsert.mockResolvedValue({ id: 'm1' })

      await cron.handle()

      expect(redis.redis.del).toHaveBeenCalledWith(
        'fixtures:league-b:2026:CLAUSURA:fecha:14',
      )
    })

    it('Debe mantener la clave de caché de siempre para la Liga', async () => {
      prisma.matches.upsert.mockResolvedValue({ id: 'm1' })

      await cron.handle()

      expect(redis.redis.del).toHaveBeenCalledWith(
        'fixtures:128:2026:CLAUSURA:fecha:14',
      )
    })

    it('Debe saltear sin reclamar una temporada con un formato sin estrategia', async () => {
      prisma.competitionSeason.findMany.mockResolvedValue([
        ligaSeason({
          id: 'season-libertadores',
          format: 'GRUPOS_Y_ELIMINACION',
        }),
      ])

      await cron.handle()

      expect(prisma.competitionSeason.updateMany).not.toHaveBeenCalled()
      expect(provider.getFixtures).not.toHaveBeenCalled()
    })

    it('Un error en una temporada no debe cortar a las demás', async () => {
      prisma.matches.upsert.mockResolvedValue({ id: 'm1' })
      prisma.competitionSeason.findMany.mockResolvedValue([
        ligaSeason(),
        ligaSeason({
          id: 'season-b',
          league: { id: 'league-b', name: 'B Nacional', api_league_id: null },
        }),
      ])
      provider.getFixtures
        .mockRejectedValueOnce(new Error('Proveedor caído'))
        .mockResolvedValueOnce([fixture])

      await cron.handle()

      expect(provider.getFixtures).toHaveBeenCalledTimes(2)
      expect(prisma.matches.upsert).toHaveBeenCalledTimes(1)
    })

    it('Un error en un partido no debe cortar a los demás', async () => {
      provider.getFixtures.mockResolvedValue([
        fixture,
        { ...fixture, externalId: 5002 },
      ])
      prisma.matches.upsert
        .mockRejectedValueOnce(new Error('Conflicto'))
        .mockResolvedValueOnce({ id: 'm2' })

      await cron.handle()

      expect(prisma.matches.upsert).toHaveBeenCalledTimes(2)
      expect(redis.redis.del).toHaveBeenCalledWith('match:details:v2:m2')
    })
  })
})
