import { Logger } from '@nestjs/common'
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
  home_penalty_goals: null,
  away_penalty_goals: null,
  status_short: '1H',
  elapsed: 30,
  home_team_id: 'h',
  away_team_id: 'a',
  home_team: { name: 'Boca' },
  away_team: { name: 'River' },
  season: 2026,
  round: 'Regular Season - 9',
  tournament: 'APERTURA',
  league: { id: 'league-1', api_league_id: 128, slug: 'liga-profesional' },
}

// Partido de otra competición (sin ID de API-Football), en vivo a la vez.
const copaMatch = {
  ...activeMatch,
  id: 'm-copa',
  api_fixture_id: 3003,
  round: 'Copa - 32avos',
  tournament: 'COPA',
  league: { id: 'league-copa', api_league_id: null, slug: 'copa-argentina' },
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
      Promise.resolve(league.api_league_id ?? 777),
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

  it('Debe borrar el detalle cacheado otra vez después de escribir el hash del vivo', async () => {
    provider.getLiveFixtures.mockResolvedValue([baseFixture()])
    const order: string[] = []
    redis.del.mockImplementation((...keys: string[]) => {
      if (keys.includes('match:details:v2:m1')) order.push('del')
      return Promise.resolve(1)
    })
    redis.hset.mockImplementation(() => {
      order.push('hset')
      return Promise.resolve(1)
    })

    await cron.handleLiveScores()

    // Un pedido entre el primer del y el hset cachearía el marcador del tick
    // anterior: el último borrado tiene que ir después del hset.
    expect(order[order.length - 1]).toBe('del')
    expect(order.lastIndexOf('del')).toBeGreaterThan(order.indexOf('hset'))
  })

  describe('tanda de penales en curso', () => {
    const inShootout = {
      ...activeMatch,
      home_goals: 1,
      away_goals: 1,
      status_short: 'P',
      elapsed: 120,
      home_penalty_goals: 2,
      away_penalty_goals: 1,
    }
    const shootoutFixture = (home: number, away: number) =>
      baseFixture({
        status: { short: 'P', long: 'Penalties', elapsed: 120 },
        goals: { home: 1, away: 1 },
        penalty: { home, away },
      })

    it('Debe publicar SCORE_UPDATED con el marcador de la tanda cuando entra un tiro', async () => {
      prisma.matches.findMany.mockResolvedValue([inShootout])
      provider.getLiveFixtures.mockResolvedValue([shootoutFixture(3, 1)])

      await cron.handleLiveScores()

      expect(prisma.matches.update).toHaveBeenCalledWith({
        where: { id: 'm1' },
        data: expect.objectContaining({
          home_penalty_goals: 3,
          away_penalty_goals: 1,
        }),
      })
      expect(redisService.publish).toHaveBeenCalledWith(
        'match_updates',
        expect.objectContaining({
          type: 'SCORE_UPDATED',
          payload: expect.objectContaining({
            home_penalty_goals: 3,
            away_penalty_goals: 1,
            status: 'P',
          }),
        }),
      )
    })

    it('Debe actualizar el hash del vivo antes de avisar el tiro por socket', async () => {
      prisma.matches.findMany.mockResolvedValue([inShootout])
      provider.getLiveFixtures.mockResolvedValue([shootoutFixture(3, 1)])
      const order: string[] = []
      redis.hset.mockImplementation((_key: string, field: unknown) => {
        if (field === 'm1') order.push('hset')
        return Promise.resolve(1)
      })
      redisService.publish.mockImplementation((channel: string) => {
        if (channel === 'match_updates') order.push('publish')
        return Promise.resolve()
      })

      await cron.handleLiveScores()

      // El detalle pisa la base con el hash: si el aviso sale antes, un
      // refetch vuelve a mostrar el marcador del tick anterior.
      expect(order.slice(0, 2)).toEqual(['hset', 'publish'])
    })

    it('No debe escribir ni publicar en cada tick si la tanda no cambió', async () => {
      prisma.matches.findMany.mockResolvedValue([inShootout])
      provider.getLiveFixtures.mockResolvedValue([shootoutFixture(2, 1)])

      await cron.handleLiveScores()

      expect(prisma.matches.update).not.toHaveBeenCalled()
      expect(redisService.publish).not.toHaveBeenCalledWith(
        'match_updates',
        expect.anything(),
      )
    })
  })

  it('No debe borrar el detalle después del hset si el partido no cambió', async () => {
    prisma.matches.findMany.mockResolvedValue([
      { ...activeMatch, home_goals: 1, status_short: '2H', elapsed: 70 },
    ])
    provider.getLiveFixtures.mockResolvedValue([baseFixture()])

    await cron.handleLiveScores()

    expect(redis.hset).toHaveBeenCalled()
    expect(redis.del).not.toHaveBeenCalledWith('match:details:v2:m1')
  })

  describe('aviso de la competición con el resultado final', () => {
    const leagueUpdates = () =>
      (redisService.publish.mock.calls as unknown[][])
        .filter((c) => c[0] === 'league_live_updates')
        .map(
          (c) =>
            c[1] as {
              leagueId: number
              slug: string
              matches: Record<string, string>
            },
        )

    it('Debe publicar el final de un partido que terminó, sin guardarlo en el hash del vivo', async () => {
      provider.getLiveFixtures.mockResolvedValue([
        baseFixture({
          status: { short: 'FT', long: 'Finished', elapsed: 90 },
          goals: { home: 1, away: 2 },
        }),
      ])

      await cron.handleLiveScores()

      const updates = leagueUpdates()
      expect(updates).toHaveLength(1)
      expect(updates[0]).toMatchObject({
        leagueId: 128,
        slug: 'liga-profesional',
      })
      expect(JSON.parse(updates[0].matches.m1)).toMatchObject({
        status_short: 'FT',
        home_goals: 1,
        away_goals: 2,
      })
      expect(redis.hset).not.toHaveBeenCalled()
    })

    it('Debe publicar en un solo aviso los partidos en juego y los que terminaron', async () => {
      prisma.matches.findMany.mockResolvedValue([
        activeMatch,
        { ...activeMatch, id: 'm2', api_fixture_id: 1002 },
      ])
      provider.getLiveFixtures.mockResolvedValue([
        baseFixture(),
        baseFixture({
          externalId: 1002,
          status: { short: 'FT', long: 'Finished', elapsed: 90 },
        }),
      ])

      await cron.handleLiveScores()

      const updates = leagueUpdates()
      expect(updates).toHaveLength(1)
      expect(Object.keys(updates[0].matches).sort()).toEqual(['m1', 'm2'])
      expect(JSON.parse(updates[0].matches.m1)).toMatchObject({
        status_short: '2H',
      })
      expect(JSON.parse(updates[0].matches.m2)).toMatchObject({
        status_short: 'FT',
      })
      // El hash de partidos en vivo solo guarda el que sigue en juego.
      expect(redis.hset).toHaveBeenCalledWith('live_scores:league:128', {
        m1: expect.any(String) as unknown,
      })
    })

    it('Debe publicar el final cuando el partido salió del feed y se cerró por id', async () => {
      provider.getLiveFixtures.mockResolvedValue([])
      prisma.matches.findMany.mockResolvedValue([
        { ...activeMatch, status_short: '2H' },
      ])
      provider.getFixture.mockResolvedValue(
        baseFixture({ status: { short: 'FT', long: 'Finished', elapsed: 90 } }),
      )

      await cron.handleLiveScores()

      const updates = leagueUpdates()
      expect(updates).toHaveLength(1)
      expect(updates[0]).toMatchObject({
        leagueId: 128,
        slug: 'liga-profesional',
      })
      expect(JSON.parse(updates[0].matches.m1)).toMatchObject({
        status_short: 'FT',
        home_goals: 1,
      })
    })

    it('No debe publicar nada si ningún partido está en juego ni terminó', async () => {
      provider.getLiveFixtures.mockResolvedValue([])
      prisma.matches.findMany.mockResolvedValue([
        { ...activeMatch, status_short: 'NS' },
      ])

      await cron.handleLiveScores()

      expect(leagueUpdates()).toHaveLength(0)
    })
  })

  describe('[VIVO]', () => {
    let log: jest.SpyInstance
    const vivo = () =>
      (log.mock.calls as unknown[][]).filter((c) =>
        String(c[0]).startsWith('[VIVO]'),
      )

    beforeEach(() => {
      log = jest.spyOn(Logger.prototype, 'log').mockImplementation()
      jest.spyOn(Logger.prototype, 'debug').mockImplementation()
    })
    afterEach(() => jest.restoreAllMocks())

    it('Debe loguear el gol con los equipos, el estado y el minuto', async () => {
      provider.getLiveFixtures.mockResolvedValue([baseFixture()])

      await cron.handleLiveScores()

      expect(vivo()).toEqual([
        [
          "[VIVO] Boca 1-0 River · 2H 70' (cambió el marcador) [liga-profesional m1]",
        ],
      ])
    })

    it('No debe loguear si solo avanzó el minuto', async () => {
      prisma.matches.findMany.mockResolvedValue([
        { ...activeMatch, home_goals: 1, status_short: '2H', elapsed: 69 },
      ])
      provider.getLiveFixtures.mockResolvedValue([baseFixture()])

      await cron.handleLiveScores()

      expect(prisma.matches.update).toHaveBeenCalled()
      expect(vivo()).toEqual([])
    })

    it('Debe loguear el final con los penales', async () => {
      provider.getLiveFixtures.mockResolvedValue([
        baseFixture({
          status: { short: 'PEN', long: 'Penalties', elapsed: 120 },
          goals: { home: 1, away: 1 },
          penalty: { home: 4, away: 3 },
        }),
      ])

      await cron.handleLiveScores()

      expect(vivo()).toEqual([
        [
          "[VIVO] Boca 1-1 River (pen. 4-3) · PEN 120' (terminó) [liga-profesional m1]",
        ],
      ])
    })

    it('Fuera del feed, solo debe loguear si el partido cambió', async () => {
      provider.getLiveFixtures.mockResolvedValue([
        baseFixture({ externalId: 2002 }),
      ])
      prisma.matches.findMany.mockResolvedValue([
        { ...activeMatch, home_goals: 1, status_short: '2H' },
      ])
      provider.getFixture.mockResolvedValue(baseFixture())

      await cron.handleLiveScores()
      expect(vivo()).toEqual([])

      provider.getFixture.mockResolvedValue(
        baseFixture({ status: { short: 'FT', long: 'Finished', elapsed: 90 } }),
      )
      ;(cron as unknown as { lastRunAt: number }).lastRunAt = 0
      await cron.handleLiveScores()
      expect(vivo()).toEqual([
        [
          "[VIVO] Boca 1-0 River · FT 90' (salió del feed, consultado por id) [liga-profesional m1]",
        ],
      ])
    })
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
      leagueDbId: 'league-1',
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

  it('Debe cerrar el último partido en juego aunque el feed en vivo venga vacío', async () => {
    provider.getLiveFixtures.mockResolvedValue([])
    prisma.matches.findMany.mockResolvedValue([
      { ...activeMatch, status_short: '2H' },
    ])
    provider.getFixture.mockResolvedValue(
      baseFixture({
        status: { short: 'PEN', long: 'Penalties', elapsed: 120 },
        goals: { home: 1, away: 1 },
        penalty: { home: 4, away: 3 },
      }),
    )

    await cron.handleLiveScores()

    expect(provider.getFixture).toHaveBeenCalledWith(1001)
    expect(prisma.matches.update).toHaveBeenCalledWith({
      where: { id: 'm1' },
      data: {
        home_goals: 1,
        away_goals: 1,
        status_short: 'PEN',
        home_penalty_goals: 4,
        away_penalty_goals: 3,
        elapsed: 120,
        is_live_finished: true,
        tracked: false,
      },
    })
    expect(redisService.publish).toHaveBeenCalledWith(
      'match_updates',
      expect.objectContaining({ matchId: 'm1', type: 'MATCH_ENDED' }),
    )
    expect(redis.del).toHaveBeenCalledWith('live_scores:league:128')
  })

  it('Un partido cerrado por la reconciliación debe invalidar la fecha y pedir la tabla', async () => {
    provider.getLiveFixtures.mockResolvedValue([])
    prisma.matches.findMany.mockResolvedValue([
      { ...activeMatch, status_short: '2H' },
    ])
    provider.getFixture.mockResolvedValue(
      baseFixture({ status: { short: 'FT', long: 'Finished', elapsed: 90 } }),
    )

    await cron.handleLiveScores()

    expect(redis.del).toHaveBeenCalledWith('fixtures:128:2026:APERTURA:fecha:9')
    expect(eventEmitter.emit).toHaveBeenCalledWith('match.finished', {
      leagueId: 128,
      leagueDbId: 'league-1',
      season: 2026,
    })
  })

  it('No debe emitir match.finished si la reconciliación encuentra el partido suspendido', async () => {
    provider.getLiveFixtures.mockResolvedValue([])
    prisma.matches.findMany.mockResolvedValue([
      { ...activeMatch, status_short: '2H' },
    ])
    provider.getFixture.mockResolvedValue(
      baseFixture({
        status: { short: 'SUSP', long: 'Suspended', elapsed: 60 },
      }),
    )

    await cron.handleLiveScores()

    expect(prisma.matches.update).toHaveBeenCalledWith({
      where: { id: 'm1' },
      data: expect.objectContaining({
        status_short: 'SUSP',
        is_live_finished: false,
        tracked: true,
      }) as unknown,
    })
    expect(eventEmitter.emit).not.toHaveBeenCalled()
  })

  it('Con el feed vacío no debe consultar partidos que todavía no empezaron', async () => {
    provider.getLiveFixtures.mockResolvedValue([])
    prisma.matches.findMany.mockResolvedValue([
      { ...activeMatch, status_short: 'NS' },
    ])

    await cron.handleLiveScores()

    expect(provider.getFixture).not.toHaveBeenCalled()
  })

  it('No debe consultar partidos trackeados que empezaron hace más de 12 horas', async () => {
    provider.getLiveFixtures.mockResolvedValue([])
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000)

    await cron.handleLiveScores()

    expect(prisma.matches.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tracked: true,
          is_live_finished: false,
          date: { gte: new Date(1_800_000_000_000 - 12 * 60 * 60 * 1000) },
        },
      }),
    )
    now.mockRestore()
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

  describe('varias competiciones', () => {
    beforeEach(() => {
      prisma.matches.findMany.mockResolvedValue([activeMatch, copaMatch])
    })

    it('Debe consultar el feed en vivo una vez por competición', async () => {
      provider.getLiveFixtures.mockResolvedValue([])

      await cron.handleLiveScores()

      expect(provider.getLiveFixtures).toHaveBeenCalledTimes(2)
      expect(provider.getLiveFixtures).toHaveBeenCalledWith(128)
      expect(provider.getLiveFixtures).toHaveBeenCalledWith(777)
      expect(redis.del).toHaveBeenCalledWith('live_scores:league:128')
      expect(redis.del).toHaveBeenCalledWith('live_scores:league:league-copa')
    })

    it('Debe actualizar el partido de cada competición con su propio feed', async () => {
      provider.getLiveFixtures.mockImplementation((leagueId: number) =>
        Promise.resolve(
          leagueId === 128
            ? [baseFixture()]
            : [baseFixture({ externalId: 3003, goals: { home: 0, away: 2 } })],
        ),
      )

      await cron.handleLiveScores()

      expect(prisma.matches.update).toHaveBeenCalledWith({
        where: { id: 'm1' },
        data: expect.objectContaining({
          home_goals: 1,
          away_goals: 0,
        }) as unknown,
      })
      expect(prisma.matches.update).toHaveBeenCalledWith({
        where: { id: 'm-copa' },
        data: expect.objectContaining({
          home_goals: 0,
          away_goals: 2,
        }) as unknown,
      })
      expect(redis.hset).toHaveBeenCalledWith(
        'live_scores:league:128',
        expect.objectContaining({ m1: expect.any(String) as unknown }),
      )
      expect(redis.hset).toHaveBeenCalledWith(
        'live_scores:league:league-copa',
        expect.objectContaining({ 'm-copa': expect.any(String) as unknown }),
      )
      expect(redisService.publish).toHaveBeenCalledWith(
        'league_live_updates',
        expect.objectContaining({
          leagueId: 'league-copa',
          slug: 'copa-argentina',
        }),
      )
      expect(redisService.publish).toHaveBeenCalledWith(
        'league_live_updates',
        expect.objectContaining({ leagueId: 128, slug: 'liga-profesional' }),
      )
    })

    it('Debe emitir match.finished con la competición y la ronda de cada partido', async () => {
      const ft = { short: 'FT', long: 'Finished', elapsed: 90 }
      provider.getLiveFixtures.mockImplementation((leagueId: number) =>
        Promise.resolve(
          leagueId === 128
            ? [baseFixture()]
            : [baseFixture({ externalId: 3003, status: ft })],
        ),
      )

      await cron.handleLiveScores()

      expect(eventEmitter.emit).toHaveBeenCalledTimes(1)
      expect(eventEmitter.emit).toHaveBeenCalledWith('match.finished', {
        leagueId: 'league-copa',
        leagueDbId: 'league-copa',
        season: 2026,
      })
      expect(redis.del).toHaveBeenCalledWith(
        'fixtures:league-copa:2026:COPA:32avos',
      )
    })

    it('Un error en una competición no debe dejar sin marcador a la otra', async () => {
      provider.getLiveFixtures.mockImplementation((leagueId: number) =>
        leagueId === 128
          ? Promise.reject(new Error('Proveedor caído'))
          : Promise.resolve([baseFixture({ externalId: 3003 })]),
      )

      await cron.handleLiveScores()

      expect(prisma.matches.update).toHaveBeenCalledTimes(1)
      expect(prisma.matches.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'm-copa' } }),
      )
    })

    it('No debe cruzar partidos entre competiciones', async () => {
      // El feed de la Liga trae (por error) el partido de la Copa.
      provider.getLiveFixtures.mockImplementation((leagueId: number) =>
        Promise.resolve(
          leagueId === 128 ? [baseFixture({ externalId: 3003 })] : [],
        ),
      )

      provider.getFixture.mockResolvedValue(null)

      await cron.handleLiveScores()

      expect(prisma.matches.update).not.toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'm-copa' } }),
      )
      expect(redis.hset).not.toHaveBeenCalled()
    })
  })
})
