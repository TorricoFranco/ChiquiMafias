import { LiveScoreCron } from './liveScoreCron'
import { FootballFixture } from '../football.types'

const baseFixture = (over: Partial<FootballFixture> = {}): FootballFixture => ({
  externalId: 1001,
  date: '2026-03-01T20:00:00+00:00',
  timestamp: 1,
  timezone: 'UTC',
  referee: null,
  venue: null,
  status: { short: '2H', long: 'Second Half', elapsed: 70 },
  league: { externalId: 128, season: 2026, round: 'Apertura - 9' },
  home: { externalId: 451, name: 'Boca', winner: null },
  away: { externalId: 435, name: 'River', winner: null },
  goals: { home: 1, away: 0 },
  penalty: { home: null, away: null },
  ...over,
})

const activeMatch = {
  id: 'm1',
  api_fixture_id: 1001,
  home_goals: 0,
  away_goals: 0,
  status_short: '1H',
  elapsed: 30,
  home_team_id: 'h',
  away_team_id: 'a',
  season: 2026,
  league: { id: 'league-1', api_league_id: 128 },
}

describe('LiveScoreCron', () => {
  const prisma = {
    matches: { findMany: jest.fn(), update: jest.fn() },
  }
  const redis = {
    del: jest.fn(),
    hdel: jest.fn(),
    hset: jest.fn(),
    expire: jest.fn(),
  }
  const redisService = { redis, publish: jest.fn() }
  const eventEmitter = { emit: jest.fn() }
  const refs = {
    providerName: 'api-football',
    leagueExternalId: jest.fn((league: { api_league_id: number | null }) =>
      Promise.resolve(league.api_league_id),
    ),
    matchExternalIds: jest.fn(
      (matches: { id: string; api_fixture_id: number | null }[]) =>
        Promise.resolve(
          new Map(
            matches
              .filter((m) => m.api_fixture_id !== null)
              .map((m) => [m.id, m.api_fixture_id as number]),
          ),
        ),
    ),
  }
  const provider = {
    liveRefreshMs: 30_000,
    getLiveFixtures: jest.fn(),
    getFixture: jest.fn(),
  }
  let cron: LiveScoreCron

  beforeEach(() => {
    jest.clearAllMocks()
    provider.liveRefreshMs = 30_000
    cron = new LiveScoreCron(
      prisma as never,
      provider as never,
      redisService as never,
      eventEmitter as never,
      refs as never,
    )
    prisma.matches.findMany.mockResolvedValue([activeMatch])
  })

  it('Debe actualizar el marcador y publicar SCORE_UPDATED si cambió el resultado', async () => {
    provider.getLiveFixtures.mockResolvedValue([baseFixture()])

    await cron.handleLiveScores()

    expect(provider.getLiveFixtures).toHaveBeenCalledWith(128)
    expect(prisma.matches.update).toHaveBeenCalledWith({
      where: { id: 'm1' },
      data: expect.objectContaining({
        home_goals: 1,
        away_goals: 0,
        status_short: '2H',
        is_live_finished: false,
        tracked: true,
      }),
    })
    expect(redisService.publish).toHaveBeenCalledWith(
      'match_updates',
      expect.objectContaining({ matchId: 'm1', type: 'SCORE_UPDATED' }),
    )
  })

  it('Debe cerrar el partido, limpiar Redis y emitir match.finished al terminar', async () => {
    provider.getLiveFixtures.mockResolvedValue([
      baseFixture({ status: { short: 'FT', long: 'Finished', elapsed: 90 } }),
    ])

    await cron.handleLiveScores()

    expect(prisma.matches.update).toHaveBeenCalledWith({
      where: { id: 'm1' },
      data: expect.objectContaining({
        status_short: 'FT',
        is_live_finished: true,
        tracked: false,
      }),
    })
    expect(redis.del).toHaveBeenCalledWith('fixtures:128:2026:APERTURA:fecha:9')
    expect(eventEmitter.emit).toHaveBeenCalledWith('match.finished', {
      leagueId: 128,
      season: 2026,
    })
    // Avisa al front: cierra el chat y recarga el partido.
    expect(redisService.publish).toHaveBeenCalledWith(
      'match_updates',
      expect.objectContaining({
        matchId: 'm1',
        type: 'MATCH_ENDED',
        payload: expect.objectContaining({ status: 'FT' }) as unknown,
      }),
    )
    // Borra la caché del estado que consulta el chat.
    expect(redis.del).toHaveBeenCalledWith(
      'match:details:v2:m1',
      'match:m1:status',
    )
  })

  it('Debe sincronizar por id un partido en juego que salió del feed en vivo', async () => {
    provider.getLiveFixtures.mockResolvedValue([
      baseFixture({ externalId: 2002 }),
    ])
    prisma.matches.findMany.mockResolvedValue([
      { ...activeMatch, status_short: '2H' },
    ])
    provider.getFixture.mockResolvedValue(
      baseFixture({ status: { short: 'FT', long: 'Finished', elapsed: 90 } }),
    )

    await cron.handleLiveScores()

    expect(provider.getFixture).toHaveBeenCalledWith(1001)
    expect(prisma.matches.update).toHaveBeenCalledWith({
      where: { id: 'm1' },
      data: expect.objectContaining({
        status_short: 'FT',
        is_live_finished: true,
        tracked: false,
      }),
    })
  })

  it('Debe saltear el tick si el proveedor refresca más lento que el cron', async () => {
    provider.liveRefreshMs = 60_000
    provider.getLiveFixtures.mockResolvedValue([])
    const now = jest.spyOn(Date, 'now')
    now.mockReturnValue(1_000_000)

    await cron.handleLiveScores()
    now.mockReturnValue(1_030_000)
    await cron.handleLiveScores()

    expect(provider.getLiveFixtures).toHaveBeenCalledTimes(1)

    now.mockReturnValue(1_060_000)
    await cron.handleLiveScores()

    expect(provider.getLiveFixtures).toHaveBeenCalledTimes(2)
    now.mockRestore()
  })

  it('No debe saltear ticks con un proveedor de 30 s', async () => {
    provider.getLiveFixtures.mockResolvedValue([])
    const now = jest.spyOn(Date, 'now')
    now.mockReturnValue(1_000_000)

    await cron.handleLiveScores()
    now.mockReturnValue(1_030_000)
    await cron.handleLiveScores()

    expect(provider.getLiveFixtures).toHaveBeenCalledTimes(2)
    now.mockRestore()
  })
})
