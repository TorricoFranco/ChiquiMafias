import { BracketService } from './bracket.service'
import { CompetitionContext } from 'src/competitions/competitions.service'
import { getFormatStrategy } from 'src/football/formats/format-registry'

const SEASON = {
  id: 'season-copa',
  league_id: 'league-copa',
  season: 2026,
  format: 'ELIMINACION',
}

let seq = 0
const matchRow = (
  round: string,
  home: string,
  away: string,
  over: Record<string, unknown> = {},
) => {
  seq += 1
  return {
    id: `m-${home}-${away}`,
    round,
    date: new Date(Date.UTC(2026, 9, 1, 0, seq)),
    home_team_id: home,
    away_team_id: away,
    status_short: 'FT',
    home_goals: 1,
    away_goals: 0,
    home_penalty_goals: null,
    away_penalty_goals: null,
    ...over,
  }
}

describe('BracketService', () => {
  const tx = {
    bracketSlot: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
    },
  }
  const prisma = {
    competitionSeason: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    bracketSlot: { findMany: jest.fn() },
    bracketDraw: { findUnique: jest.fn() },
    matches: { findMany: jest.fn() },
    $transaction: jest.fn((cb: (t: typeof tx) => unknown) =>
      Promise.resolve(cb(tx)),
    ),
  }
  const redis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    hgetall: jest.fn(),
  }
  let service: BracketService

  const createdSlots = () =>
    (
      tx.bracketSlot.createMany.mock.calls[0] as [
        { data: Record<string, unknown>[] },
      ]
    )[0].data

  beforeEach(() => {
    jest.clearAllMocks()
    seq = 0
    prisma.competitionSeason.findUnique.mockResolvedValue(SEASON)
    prisma.bracketSlot.findMany.mockResolvedValue([])
    prisma.bracketDraw.findUnique.mockResolvedValue(null)
    prisma.matches.findMany.mockResolvedValue([])
    redis.hgetall.mockResolvedValue({})
    service = new BracketService(prisma as never, { redis } as never)
  })

  describe('syncSeason', () => {
    it('Debe guardar las 63 llaves del cuadro y limpiar la caché', async () => {
      prisma.matches.findMany.mockResolvedValue([
        matchRow('Semifinal', 'a', 'b'),
        matchRow('Semifinal', 'c', 'd', { homeGoals: 0 }),
      ])

      await service.syncSeason('season-copa')

      expect(prisma.matches.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            league_id: 'league-copa',
            season: 2026,
            tournament: { in: ['ELIMINACION'] },
          },
        }),
      )
      expect(tx.bracketSlot.deleteMany).toHaveBeenCalledWith({
        where: {
          competition_season_id: 'season-copa',
          manually_corrected: false,
        },
      })
      const slots = createdSlots()
      expect(slots).toHaveLength(63)
      // La final, sin partido todavía, ya tiene a los dos ganadores de las semis.
      expect(slots.find((s) => s.round_order === 6)).toEqual(
        expect.objectContaining({
          match_id: null,
          home_team_id: 'a',
          away_team_id: 'c',
        }),
      )
      expect(redis.del).toHaveBeenCalledWith('bracket:v1:season-copa')
    })

    it('Con sorteo cargado debe ordenar el cuadro según él', async () => {
      // 32 cruces: el sorteo pone c-d arriba y a-b en el segundo lugar.
      const pairs = [
        ['c', 'd'],
        ['a', 'b'],
        ...Array.from({ length: 30 }, (_, i) => [`x${i}`, `y${i}`]),
      ]
      prisma.bracketDraw.findUnique.mockResolvedValue({ pairs })
      prisma.matches.findMany.mockResolvedValue([
        matchRow('32avos de final', 'a', 'b'),
      ])

      await service.syncSeason('season-copa')

      const slots = createdSlots()
      expect(
        slots.find((s) => s.round_order === 1 && s.position === 2),
      ).toEqual(
        expect.objectContaining({ match_id: 'm-a-b', winner_team_id: 'a' }),
      )
      // Sin partido todavía, la llave 1 ya muestra los equipos del sorteo.
      expect(
        slots.find((s) => s.round_order === 1 && s.position === 1),
      ).toEqual(
        expect.objectContaining({
          match_id: null,
          home_team_id: 'c',
          away_team_id: 'd',
        }),
      )
      expect(
        slots.find((s) => s.round_order === 2 && s.position === 1),
      ).toEqual(
        expect.objectContaining({ home_team_id: null, away_team_id: 'a' }),
      )
    })

    it('No debe hacer nada en un formato sin cuadro', async () => {
      prisma.competitionSeason.findUnique.mockResolvedValue({
        ...SEASON,
        format: 'LIGA_DIVIDIDA',
      })

      await service.syncSeason('season-liga')

      expect(prisma.matches.findMany).not.toHaveBeenCalled()
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })

    it('Debe respetar una llave corregida a mano y hacer avanzar a su ganador', async () => {
      prisma.bracketSlot.findMany.mockResolvedValue([
        {
          round_order: 5,
          position: 1,
          match_id: 'm-a-b',
          home_team_id: 'a',
          away_team_id: 'b',
          winner_team_id: 'b',
          manually_corrected: true,
        },
      ])
      prisma.matches.findMany.mockResolvedValue([
        matchRow('Semifinal', 'a', 'b'),
        matchRow('Semifinal', 'c', 'd'),
      ])

      await service.syncSeason('season-copa')

      const slots = createdSlots()
      expect(slots).toHaveLength(62)
      // El partido de la llave corregida no se vuelve a ubicar.
      expect(slots.filter((s) => s.match_id === 'm-a-b')).toEqual([])
      expect(slots.find((s) => s.round_order === 6)).toEqual(
        expect.objectContaining({ home_team_id: 'b' }),
      )
    })

    it('Una llave corregida antes de que exista su partido debe tomarlo cuando aparece', async () => {
      prisma.bracketSlot.findMany.mockResolvedValue([
        {
          round_order: 5,
          position: 1,
          match_id: null,
          home_team_id: 'a',
          away_team_id: 'b',
          winner_team_id: null,
          manually_corrected: true,
        },
      ])
      prisma.matches.findMany.mockResolvedValue([
        matchRow('Semifinal', 'b', 'a'),
        matchRow('Semifinal', 'c', 'd'),
      ])

      await service.syncSeason('season-copa')

      expect(tx.bracketSlot.update).toHaveBeenCalledWith({
        where: {
          competition_season_id_round_order_position: {
            competition_season_id: 'season-copa',
            round_order: 5,
            position: 1,
          },
        },
        data: { match_id: 'm-b-a' },
      })
      const slots = createdSlots()
      // El partido no se duplica en otra llave y la otra semi sigue en su lugar.
      expect(slots.filter((s) => s.match_id === 'm-b-a')).toEqual([])
      expect(
        slots.find((s) => s.round_order === 5 && s.position === 2),
      ).toEqual(expect.objectContaining({ match_id: 'm-c-d' }))
    })

    it('Una corrección debe esperar a que termine el rearmado en curso', async () => {
      const order: string[] = []
      let release!: () => void
      prisma.matches.findMany.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            release = () => {
              order.push('rearmado')
              resolve([])
            }
          }),
      )

      const sync = service.syncSeason('season-copa')
      const correction = service.runExclusive('season-copa', () => {
        order.push('corrección')
        return Promise.resolve()
      })
      await new Promise((r) => setImmediate(r))
      expect(order).toEqual([])

      release()
      await Promise.all([sync, correction])
      expect(order).toEqual(['rearmado', 'corrección'])
    })

    it('Un error dentro del bloqueo no debe trabar las operaciones siguientes', async () => {
      await expect(
        service.runExclusive('season-copa', () =>
          Promise.reject(new Error('falló')),
        ),
      ).rejects.toThrow('falló')

      await expect(
        service.runExclusive('season-copa', () => Promise.resolve('ok')),
      ).resolves.toBe('ok')
    })

    it('Dos sincronizaciones juntas de la misma temporada deben correr una después de la otra', async () => {
      let release!: () => void
      prisma.matches.findMany.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            release = () => resolve([])
          }),
      )

      const first = service.syncSeason('season-copa')
      const second = service.syncSeason('season-copa')
      await new Promise((r) => setImmediate(r))
      expect(prisma.matches.findMany).toHaveBeenCalledTimes(1)

      release()
      await Promise.all([first, second])
      expect(prisma.matches.findMany).toHaveBeenCalledTimes(2)
      expect(prisma.$transaction).toHaveBeenCalledTimes(2)
    })
  })

  describe('eventos', () => {
    it('Al terminar un partido debe rearmar el cuadro de su temporada', async () => {
      const sync = jest.spyOn(service, 'syncSeason').mockResolvedValue()

      await service.onMatchFinished({
        leagueId: 'league-copa',
        leagueDbId: 'league-copa',
        season: 2026,
      })

      expect(prisma.competitionSeason.findUnique).toHaveBeenCalledWith({
        where: { league_id_season: { league_id: 'league-copa', season: 2026 } },
        select: { id: true },
      })
      expect(sync).toHaveBeenCalledWith('season-copa')
    })

    it('Un error al rearmar no debe propagarse al que emitió el evento', async () => {
      jest.spyOn(service, 'syncSeason').mockRejectedValue(new Error('DB caída'))

      await expect(
        service.onFixturesSynced({ seasonId: 'season-copa' }),
      ).resolves.toBeUndefined()
    })
  })

  describe('getBracket', () => {
    const copa = {
      leagueId: 'league-copa',
      season: 2026,
      cacheKey: 'league-copa',
      strategy: getFormatStrategy('ELIMINACION'),
    } as CompetitionContext

    const slotRow = (round: number, position: number, over = {}) => ({
      round_order: round,
      position,
      match_id: null,
      winner_team_id: null,
      match: null,
      home_team: null,
      away_team: null,
      ...over,
    })

    beforeEach(() => {
      prisma.competitionSeason.findUniqueOrThrow.mockResolvedValue({
        id: 'season-copa',
      })
      redis.get.mockResolvedValue(null)
    })

    it('Debe devolver las seis rondas en orden y cachear el cuadro', async () => {
      prisma.bracketSlot.findMany.mockResolvedValue([
        slotRow(6, 1),
        slotRow(1, 2),
        slotRow(1, 1, {
          match_id: 'm1',
          match: {
            date: new Date('2026-01-18T20:00:00Z'),
            status_short: 'PEN',
            home_goals: 1,
            away_goals: 1,
            home_penalty_goals: 4,
            away_penalty_goals: 3,
          },
          home_team: {
            id: 't1',
            name: 'Midland',
            logo_url: 'https://res.cloudinary.com/x/team_1.png',
            api_team_id: null,
          },
          winner_team_id: 't1',
        }),
      ])

      const bracket = await service.getBracket(copa)

      expect(bracket.rounds.map((r) => r.key)).toEqual([
        '32avos',
        '16avos',
        'octavos',
        'cuartos',
        'semifinal',
        'final',
      ])
      expect(bracket.rounds[0].slots.map((s) => s.position)).toEqual([1, 2])
      expect(bracket.rounds[0].slots[0]).toEqual(
        expect.objectContaining({
          matchId: 'm1',
          status: 'PEN',
          homePenalties: 4,
          home: {
            id: 't1',
            name: 'Midland',
            logoUrl: 'https://res.cloudinary.com/x/team_1.png',
            apiTeamId: null,
          },
          away: null,
          winnerTeamId: 't1',
        }),
      )
      expect(redis.set).toHaveBeenCalledWith(
        'bracket:v1:season-copa',
        expect.any(String),
        'EX',
        60,
      )
    })

    it('Debe sumar el marcador en vivo sobre el cuadro cacheado', async () => {
      redis.get.mockResolvedValue(
        JSON.stringify({
          rounds: [
            {
              order: 5,
              key: 'semifinal',
              name: 'Semifinal',
              slots: [
                {
                  position: 1,
                  matchId: 'm-semi',
                  status: 'NS',
                  isLive: false,
                  homeGoals: null,
                  awayGoals: null,
                },
              ],
            },
          ],
        }),
      )
      redis.hgetall.mockResolvedValue({
        'm-semi': JSON.stringify({
          status_short: '2H',
          home_goals: 2,
          away_goals: 1,
          home_penalty_goals: null,
          away_penalty_goals: null,
        }),
      })

      const bracket = await service.getBracket(copa)

      expect(redis.hgetall).toHaveBeenCalledWith(
        'live_scores:league:league-copa',
      )
      expect(prisma.bracketSlot.findMany).not.toHaveBeenCalled()
      expect(bracket.rounds[0].slots[0]).toEqual(
        expect.objectContaining({
          status: '2H',
          isLive: true,
          homeGoals: 2,
          awayGoals: 1,
        }),
      )
    })

    it('Si el cuadro todavía no se armó, debe armarlo antes de responder', async () => {
      prisma.bracketSlot.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([slotRow(6, 1)])
      const sync = jest.spyOn(service, 'syncSeason').mockResolvedValue()

      const bracket = await service.getBracket(copa)

      expect(sync).toHaveBeenCalledWith('season-copa')
      expect(bracket.rounds[5].slots).toHaveLength(1)
    })
  })
})
