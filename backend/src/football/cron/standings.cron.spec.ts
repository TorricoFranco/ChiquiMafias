import { StandingCron } from './standings.cron'
import { FootballStandingRow } from '../football.types'

const NOW = new Date('2026-10-22T15:00:00.000Z')

const ligaSeason = (over: Record<string, unknown> = {}) => ({
  id: 'season-liga',
  league_id: 'league-1',
  season: 2026,
  label: '2026',
  format: 'LIGA_DIVIDIDA',
  sync_enabled: true,
  standings_sync_minutes: 10,
  last_standings_sync_at: null as Date | null,
  league: { id: 'league-1', name: 'LPA', api_league_id: 128 },
  ...over,
})

const row = {
  group: 'Clausura, Group B',
  team: { externalId: 451, name: 'Boca' },
} as FootballStandingRow

describe('StandingCron', () => {
  const prisma = {
    competitionSeason: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    teamSeasonStats: { upsert: jest.fn() },
  }
  const redis = { redis: { set: jest.fn() } }
  const provider = { getStandings: jest.fn() }
  const standings = { calculateFullStandings: jest.fn() }
  const refs = {
    providerName: 'api-football',
    leagueExternalId: jest.fn(),
    resolveTeam: jest.fn(),
  }
  let cron: StandingCron

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers({ now: NOW })
    prisma.competitionSeason.findMany.mockResolvedValue([ligaSeason()])
    prisma.competitionSeason.updateMany.mockResolvedValue({ count: 1 })
    refs.leagueExternalId.mockImplementation(
      (league: { api_league_id: number | null }) =>
        Promise.resolve(league.api_league_id ?? 999),
    )
    refs.resolveTeam.mockResolvedValue({ id: 'team-boca' })
    provider.getStandings.mockResolvedValue([row])
    standings.calculateFullStandings.mockResolvedValue({ tabla: [] })
    cron = new StandingCron(
      prisma as never,
      provider as never,
      redis as never,
      standings as never,
      refs as never,
    )
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('Debe recorrer solo las temporadas con tabla y sync_enabled', async () => {
    await cron.fetchStandings()

    expect(prisma.competitionSeason.findMany).toHaveBeenCalledWith({
      where: { sync_enabled: true, standings_sync_minutes: { not: null } },
      include: { league: true },
    })
  })

  it('Debe reclamar la temporada, pedir la tabla y guardarla con la fase de la estrategia', async () => {
    await cron.fetchStandings()

    expect(prisma.competitionSeason.updateMany).toHaveBeenCalledWith({
      where: { id: 'season-liga', last_standings_sync_at: null },
      data: { last_standings_sync_at: NOW },
    })
    expect(provider.getStandings).toHaveBeenCalledWith(128, 2026)
    expect(prisma.teamSeasonStats.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          league_id_season_stage_team_id: {
            league_id: 'league-1',
            season: 2026,
            stage: 'CLAUSURA',
            team_id: 'team-boca',
          },
        },
        update: expect.objectContaining({ group_name: 'B' }) as unknown,
      }),
    )
    expect(redis.redis.set).toHaveBeenCalledWith(
      'standings:league-1:2026',
      JSON.stringify({ tabla: [] }),
      'EX',
      3600,
    )
  })

  it('No debe pedir la tabla si otro tick ya reclamó la temporada', async () => {
    prisma.competitionSeason.updateMany.mockResolvedValue({ count: 0 })

    await cron.fetchStandings()

    expect(provider.getStandings).not.toHaveBeenCalled()
  })

  it('Debe respetar la frecuencia de cada temporada', async () => {
    prisma.competitionSeason.findMany.mockResolvedValue([
      ligaSeason({
        last_standings_sync_at: new Date(NOW.getTime() - 5 * 60_000),
      }),
      ligaSeason({
        id: 'season-b',
        last_standings_sync_at: new Date(NOW.getTime() - 11 * 60_000),
        league: { id: 'league-b', name: 'B Nacional', api_league_id: null },
      }),
    ])

    await cron.fetchStandings()

    expect(provider.getStandings).toHaveBeenCalledTimes(1)
    expect(provider.getStandings).toHaveBeenCalledWith(999, 2026)
  })

  it('Debe saltear una temporada con un formato sin estrategia', async () => {
    prisma.competitionSeason.findMany.mockResolvedValue([
      ligaSeason({ format: 'ELIMINACION' }),
    ])

    await cron.fetchStandings()

    expect(prisma.competitionSeason.updateMany).not.toHaveBeenCalled()
    expect(provider.getStandings).not.toHaveBeenCalled()
  })

  it('Un error en una temporada no debe cortar a las demás', async () => {
    prisma.competitionSeason.findMany.mockResolvedValue([
      ligaSeason(),
      ligaSeason({
        id: 'season-b',
        league: { id: 'league-b', name: 'B Nacional', api_league_id: null },
      }),
    ])
    provider.getStandings
      .mockRejectedValueOnce(new Error('Proveedor caído'))
      .mockResolvedValueOnce([row])

    await cron.fetchStandings()

    expect(provider.getStandings).toHaveBeenCalledTimes(2)
    expect(redis.redis.set).toHaveBeenCalledWith(
      'standings:league-b:2026',
      expect.any(String),
      'EX',
      3600,
    )
  })

  describe('al terminar un partido', () => {
    const finished = { leagueId: 128, leagueDbId: 'league-1', season: 2026 }

    beforeEach(() => {
      prisma.competitionSeason.findUnique.mockResolvedValue(ligaSeason())
    })

    it('Debe actualizar la tabla de la competición del partido un minuto después', async () => {
      cron.handleMatchFinished(finished)
      expect(provider.getStandings).not.toHaveBeenCalled()

      await jest.advanceTimersByTimeAsync(60_000)

      expect(prisma.competitionSeason.findUnique).toHaveBeenCalledWith({
        where: { league_id_season: { league_id: 'league-1', season: 2026 } },
        include: { league: true },
      })
      expect(prisma.competitionSeason.update).toHaveBeenCalledWith({
        where: { id: 'season-liga' },
        data: { last_standings_sync_at: expect.any(Date) as unknown },
      })
      expect(provider.getStandings).toHaveBeenCalledWith(128, 2026)
    })

    it('Debe pedir la tabla una sola vez si terminan varios partidos juntos', async () => {
      cron.handleMatchFinished(finished)
      cron.handleMatchFinished(finished)
      cron.handleMatchFinished(finished)

      await jest.advanceTimersByTimeAsync(60_000)

      expect(provider.getStandings).toHaveBeenCalledTimes(1)
    })

    it('Debe esperar un minuto desde el último final, no desde el primero', async () => {
      cron.handleMatchFinished(finished)
      await jest.advanceTimersByTimeAsync(50_000)
      cron.handleMatchFinished(finished)

      await jest.advanceTimersByTimeAsync(10_000)
      expect(provider.getStandings).not.toHaveBeenCalled()

      await jest.advanceTimersByTimeAsync(50_000)
      expect(provider.getStandings).toHaveBeenCalledTimes(1)
    })

    it('Debe actualizar por separado la tabla de cada competición', async () => {
      prisma.competitionSeason.findUnique.mockImplementation(
        ({ where }: { where: { league_id_season: { league_id: string } } }) =>
          Promise.resolve(
            where.league_id_season.league_id === 'league-1'
              ? ligaSeason()
              : ligaSeason({
                  id: 'season-b',
                  league: {
                    id: 'league-b',
                    name: 'B Nacional',
                    api_league_id: null,
                  },
                }),
          ),
      )

      cron.handleMatchFinished(finished)
      cron.handleMatchFinished({ ...finished, leagueDbId: 'league-b' })
      await jest.advanceTimersByTimeAsync(60_000)

      expect(provider.getStandings).toHaveBeenCalledTimes(2)
      expect(provider.getStandings).toHaveBeenCalledWith(128, 2026)
      expect(provider.getStandings).toHaveBeenCalledWith(999, 2026)
    })

    it('No debe pedir la tabla de una competición sin tabla', async () => {
      prisma.competitionSeason.findUnique.mockResolvedValue(
        ligaSeason({ standings_sync_minutes: null }),
      )

      cron.handleMatchFinished(finished)
      await jest.advanceTimersByTimeAsync(60_000)

      expect(provider.getStandings).not.toHaveBeenCalled()
    })

    it('No debe pedir la tabla de una temporada que no se sincroniza', async () => {
      prisma.competitionSeason.findUnique.mockResolvedValue(
        ligaSeason({ sync_enabled: false }),
      )

      cron.handleMatchFinished(finished)
      await jest.advanceTimersByTimeAsync(60_000)

      expect(provider.getStandings).not.toHaveBeenCalled()
    })
  })
})
