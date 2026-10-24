import {
  EventsFetchCron,
  buildEventKey,
  toWireEvent,
} from './events-fetch.cron'
import { FootballEvent } from '../football.types'

const goal: FootballEvent = {
  minute: 45,
  extraMinute: 2,
  type: 'Goal',
  detail: 'Normal Goal',
  team: { externalId: 451, name: 'Boca Juniors', logo: 'b.png' },
  player: { externalId: 10, name: 'Cavani' },
  assist: null,
}

describe('EventsFetchCron helpers', () => {
  it('Debe armar el id del evento como antes (api_event_id estable)', () => {
    expect(buildEventKey(goal)).toBe('45-451-10-goal-normal_goal')
  })

  it('Debe usar NONE si el detalle es null o la cadena "null"', () => {
    expect(buildEventKey({ ...goal, detail: null })).toBe('45-451-10-goal-none')
    expect(buildEventKey({ ...goal, detail: 'null' })).toBe(
      '45-451-10-goal-none',
    )
  })

  it('Debe usar 0 como jugador cuando no hay', () => {
    expect(buildEventKey({ ...goal, player: null })).toBe(
      '45-451-0-goal-normal_goal',
    )
  })

  it('Debe publicar el evento con la forma que lee el gateway y el front', () => {
    expect(toWireEvent(goal)).toEqual({
      time: { elapsed: 45, extra: 2 },
      team: { id: 451, name: 'Boca Juniors', logo: 'b.png' },
      player: { id: 10, name: 'Cavani' },
      assist: null,
      type: 'Goal',
      detail: 'Normal Goal',
    })
  })

  it('Debe mandar detail NONE por socket si el evento no tiene detalle', () => {
    expect(toWireEvent({ ...goal, detail: null }).detail).toBe('NONE')
  })
})

describe('EventsFetchCron.fetchEvents', () => {
  const prisma = {
    matches: { findMany: jest.fn(), update: jest.fn() },
    matchEvents: { deleteMany: jest.fn() },
    $transaction: jest.fn(),
  }
  const redis = { get: jest.fn(), set: jest.fn(), del: jest.fn() }
  const redisService = { redis, publish: jest.fn() }
  const provider = { getEvents: jest.fn() }
  const refs = {
    matchExternalIds: jest.fn((matches: { id: string }[]) =>
      Promise.resolve(new Map(matches.map((m) => [m.id, 900]))),
    ),
    resolveTeam: jest.fn(() => Promise.resolve({ id: 'team-1' })),
    resolvePlayer: jest.fn(() => Promise.resolve({ id: 'player-1' })),
  }
  let cron: EventsFetchCron

  const match = (status_short: string) => ({
    id: 'm1',
    api_fixture_id: 1,
    status_short,
    league: { api_league_id: 128 },
  })

  beforeEach(() => {
    jest.clearAllMocks()
    cron = new EventsFetchCron(
      prisma as never,
      provider as never,
      redisService as never,
      refs as never,
    )
    provider.getEvents.mockResolvedValue([goal, goal])
    prisma.$transaction.mockImplementation((cb: (tx: unknown) => unknown) =>
      Promise.resolve(
        cb({ matchEvents: { upsert: jest.fn(), deleteMany: jest.fn() } }),
      ),
    )
  })

  it('finalización: un partido terminado sin eventos nuevos se cierra y no se vuelve a consultar', async () => {
    prisma.matches.findMany.mockResolvedValue([match('FT')])
    redis.get.mockResolvedValue('2')

    await cron.fetchEvents()

    expect(prisma.matches.update).toHaveBeenCalledWith({
      where: { id: 'm1' },
      data: expect.objectContaining({
        events_fetched: true,
        events_finalized: true,
      }),
    })
    // No reescribe eventos ni avisa por socket: no hay nada nuevo.
    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(redisService.publish).not.toHaveBeenCalled()
  })

  it('finalización: un partido en juego sin eventos nuevos no se cierra', async () => {
    prisma.matches.findMany.mockResolvedValue([match('2H')])
    redis.get.mockResolvedValue('2')

    await cron.fetchEvents()

    expect(prisma.matches.update).not.toHaveBeenCalled()
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('finalización: un partido terminado con eventos nuevos los guarda, avisa y se cierra', async () => {
    prisma.matches.findMany.mockResolvedValue([match('FT')])
    redis.get.mockResolvedValue('1')

    await cron.fetchEvents()

    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(prisma.matches.update).toHaveBeenCalledWith({
      where: { id: 'm1' },
      data: expect.objectContaining({ events_finalized: true }),
    })
    expect(redisService.publish).toHaveBeenCalledWith(
      'match_updates',
      expect.objectContaining({ matchId: 'm1', type: 'EVENTS_UPDATED' }),
    )
  })

  it('finalización: un partido en juego con eventos nuevos los guarda pero no se cierra', async () => {
    prisma.matches.findMany.mockResolvedValue([match('1H')])
    redis.get.mockResolvedValue(null)

    await cron.fetchEvents()

    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(prisma.matches.update).not.toHaveBeenCalled()
  })
})
