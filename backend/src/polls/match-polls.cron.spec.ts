import { Logger } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { MatchPollKind, Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { MatchPollsCron } from './match-polls.cron'

describe('MatchPollsCron', () => {
  let cron: MatchPollsCron
  let errorSpy: jest.SpyInstance
  let logSpy: jest.SpyInstance

  const NOW = new Date('2026-11-02T22:00:00.000Z')
  const HOUR_MS = 60 * 60 * 1000
  const SEASONS = [{ league_id: 'league-1', season: 2026 }]

  const mockPrisma = {
    competitionSeason: { findMany: jest.fn() },
    matches: { findMany: jest.fn() },
    poll: { create: jest.fn() },
  }

  const buildMatch = (over: Record<string, unknown> = {}) => ({
    id: 'match-1',
    tournament: 'CLAUSURA',
    round: 'Clausura - 5',
    referee: 'Facundo Tello, Argentina',
    home_goals: 2,
    away_goals: 1,
    home_penalty_goals: null,
    away_penalty_goals: null,
    home_team: { name: 'Boca Juniors' },
    away_team: { name: 'River Plate' },
    league: {
      name: 'Liga Profesional Argentina',
      short_name: 'Liga Profesional',
    },
    polls: [] as { matchKind: MatchPollKind }[],
    ...over,
  })

  const uniqueViolation = () =>
    new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: 'test',
    })

  type CreateArg = { data: Record<string, unknown> }
  const createdPolls = () =>
    (mockPrisma.poll.create.mock.calls as CreateArg[][]).map(
      (call) => call[0].data,
    )

  type FindManyArg = { where: Record<string, unknown> } & Record<
    string,
    unknown
  >
  const matchesQuery = () =>
    (mockPrisma.matches.findMany.mock.calls as FindManyArg[][])[0][0]

  const run = async (matches: ReturnType<typeof buildMatch>[]) => {
    mockPrisma.competitionSeason.findMany.mockResolvedValue(SEASONS)
    mockPrisma.matches.findMany.mockResolvedValue(matches)
    await cron.handleFinishedMatches()
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchPollsCron,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()

    cron = module.get<MatchPollsCron>(MatchPollsCron)

    jest.clearAllMocks()
    mockPrisma.poll.create.mockResolvedValue({ id: 'poll-1' })
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation()
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation()
    jest.useFakeTimers({ now: NOW })
  })

  afterEach(() => {
    jest.useRealTimers()
    errorSpy.mockRestore()
    logSpy.mockRestore()
  })

  it('Debe crear la puntuación del árbitro y la encuesta del partido de un partido terminado con árbitro', async () => {
    await run([buildMatch()])

    const [referee, review] = createdPolls()
    expect(mockPrisma.poll.create).toHaveBeenCalledTimes(2)
    expect(referee).toMatchObject({
      type: 'RATING',
      matchId: 'match-1',
      matchKind: 'REFEREE_RATING',
    })
    expect(referee.title).toBe(
      '¿Cómo viste el arbitraje de Facundo Tello en Boca Juniors vs River Plate (Fecha 5 Clausura)?',
    )
    expect(review).toMatchObject({
      type: 'CLASSIC',
      matchId: 'match-1',
      matchKind: 'MATCH_REVIEW',
    })
    expect(review.options).toHaveLength(4)
  })

  it('Debe abrir las encuestas ya, por 48 horas, oficiales y sin autor', async () => {
    await run([buildMatch()])

    for (const data of createdPolls()) {
      expect(data).toMatchObject({
        status: 'ACTIVE',
        startsAt: NOW,
        endsAt: new Date(NOW.getTime() + 48 * HOUR_MS),
        isOfficial: true,
        ticketCost: 0,
        icon: 'FOOTBALL',
      })
      expect(data).not.toHaveProperty('createdByAdminId')
      expect(data).not.toHaveProperty('userId')
    }
  })

  it('Debe dejar sin comentarios la encuesta del árbitro y con comentarios la del partido', async () => {
    await run([buildMatch()])

    const [referee, review] = createdPolls()
    expect(referee.matchKind).toBe('REFEREE_RATING')
    expect(referee.commentsEnabled).toBe(false)
    expect(review.matchKind).toBe('MATCH_REVIEW')
    expect(review.commentsEnabled).toBe(true)
  })

  it('Debe guardar las opciones fijas de la puntuación y ninguna config en la del partido', async () => {
    await run([buildMatch()])

    const [referee, review] = createdPolls()
    expect(referee.options).toHaveLength(5)
    expect(referee.config).toEqual({ scale: 5 })
    expect(review.config).toBe(Prisma.DbNull)
  })

  it.each([null, '', '   ', ', Argentina'])(
    'Debe crear solo la encuesta del partido si el árbitro no está cargado (%p)',
    async (referee) => {
      await run([buildMatch({ referee })])

      expect(createdPolls()).toHaveLength(1)
      expect(createdPolls()[0].matchKind).toBe('MATCH_REVIEW')
    },
  )

  it('Debe crear después la del árbitro si se cargó cuando la del partido ya existía', async () => {
    await run([buildMatch({ polls: [{ matchKind: 'MATCH_REVIEW' }] })])

    expect(createdPolls()).toHaveLength(1)
    expect(createdPolls()[0].matchKind).toBe('REFEREE_RATING')
  })

  it('Debe crear solo la del partido si la del árbitro ya existía', async () => {
    await run([buildMatch({ polls: [{ matchKind: 'REFEREE_RATING' }] })])

    expect(createdPolls()).toHaveLength(1)
    expect(createdPolls()[0].matchKind).toBe('MATCH_REVIEW')
  })

  it('No debe crear nada si el partido ya tiene las dos', async () => {
    await run([
      buildMatch({
        polls: [{ matchKind: 'REFEREE_RATING' }, { matchKind: 'MATCH_REVIEW' }],
      }),
    ])

    expect(mockPrisma.poll.create).not.toHaveBeenCalled()
  })

  it('Debe seguir con la otra encuesta si una ya la creó otra corrida', async () => {
    mockPrisma.poll.create
      .mockRejectedValueOnce(uniqueViolation())
      .mockResolvedValueOnce({ id: 'poll-2' })

    await run([buildMatch()])

    expect(mockPrisma.poll.create).toHaveBeenCalledTimes(2)
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('Debe loguear el error y crear la encuesta del partido aunque falle la del árbitro', async () => {
    mockPrisma.poll.create
      .mockRejectedValueOnce(new Error('db caída'))
      .mockResolvedValueOnce({ id: 'poll-2' })

    await run([buildMatch()])

    expect(mockPrisma.poll.create).toHaveBeenCalledTimes(2)
    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect((errorSpy.mock.calls as string[][])[0][0]).toContain(
      'REFEREE_RATING',
    )
  })

  it('Un error en un partido no debe cortar las encuestas de los demás', async () => {
    mockPrisma.poll.create
      .mockRejectedValueOnce(new Error('db caída'))
      .mockRejectedValueOnce(new Error('db caída'))

    await run([buildMatch({ id: 'match-1' }), buildMatch({ id: 'match-2' })])

    expect(mockPrisma.poll.create).toHaveBeenCalledTimes(4)
    expect(errorSpy).toHaveBeenCalledTimes(2)
    expect(
      createdPolls()
        .slice(2)
        .map((data) => data.matchId),
    ).toEqual(['match-2', 'match-2'])
  })

  it('Debe buscar partidos terminados de las últimas 12 horas, de las temporadas sincronizadas, a los que les falte alguna encuesta', async () => {
    await run([])

    expect(mockPrisma.competitionSeason.findMany).toHaveBeenCalledWith({
      where: { sync_enabled: true },
      select: { league_id: true, season: true },
    })
    const query = matchesQuery()
    expect(query.where).toMatchObject({
      status_short: { in: ['FT', 'AET', 'PEN'] },
      date: { gte: new Date(NOW.getTime() - 12 * HOUR_MS) },
      AND: [
        { OR: [{ league_id: 'league-1', season: 2026 }] },
        {
          OR: [
            { polls: { none: { matchKind: 'MATCH_REVIEW' } } },
            {
              referee: { not: null },
              NOT: { referee: '' },
              polls: { none: { matchKind: 'REFEREE_RATING' } },
            },
          ],
        },
      ],
    })
    expect(query.take).toBe(50)
  })

  it('No debe buscar partidos si ninguna temporada se sincroniza', async () => {
    mockPrisma.competitionSeason.findMany.mockResolvedValue([])

    await cron.handleFinishedMatches()

    expect(mockPrisma.matches.findMany).not.toHaveBeenCalled()
    expect(mockPrisma.poll.create).not.toHaveBeenCalled()
  })

  it('No debe lanzar si falla la consulta de partidos', async () => {
    mockPrisma.competitionSeason.findMany.mockResolvedValue(SEASONS)
    mockPrisma.matches.findMany.mockRejectedValue(new Error('db caída'))

    await expect(cron.handleFinishedMatches()).resolves.toBeUndefined()

    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(mockPrisma.poll.create).not.toHaveBeenCalled()
  })
})
