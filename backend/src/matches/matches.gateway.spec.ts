import { WsException } from '@nestjs/websockets'
import { MatchesGateway } from './matches.gateway'

describe('MatchesGateway (estado del chat)', () => {
  const redis = { get: jest.fn(), set: jest.fn() }
  const redisService = { redis, subscribe: jest.fn() }
  // Si el mensaje pasa el chequeo del partido, lo siguiente es el control de
  // ritmo: que llegue a RATE_LIMIT prueba que el chat estaba abierto.
  const chatService = {
    checkMessageRate: jest.fn(() => ({ allowed: false, retryIn: 5 })),
  }
  const prisma = { matches: { findUnique: jest.fn() } }
  let gateway: MatchesGateway

  const client = {
    data: { user: { id: 'user-1', tier: 'NONE' } },
  }
  const send = () =>
    gateway.handleMatchMessage(
      { matchId: 'match-1', message: 'Vamos' },
      client as never,
    )

  const errorCode = async (promise: Promise<unknown>) => {
    try {
      await promise
      return null
    } catch (error) {
      expect(error).toBeInstanceOf(WsException)
      return ((error as WsException).getError() as { code: string }).code
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    gateway = new MatchesGateway(
      redisService as never,
      chatService as never,
      {} as never,
      prisma as never,
    )
  })

  it.each(['NS', 'PST', 'SUSP', 'INT', 'FT', 'AET', 'PEN', 'CANC'])(
    'Debe rechazar mensajes con el partido en %s',
    async (status) => {
      redis.get.mockResolvedValue(status)

      expect(await errorCode(send())).toBe('MATCH_INACTIVE')
      expect(chatService.checkMessageRate).not.toHaveBeenCalled()
    },
  )

  it.each(['1H', 'HT', '2H', 'ET', 'P'])(
    'Debe aceptar mensajes con el partido en juego (%s)',
    async (status) => {
      redis.get.mockResolvedValue(status)

      expect(await errorCode(send())).toBe('RATE_LIMIT')
    },
  )

  it('Sin caché debe leer el estado de la base y guardarlo 30 segundos', async () => {
    redis.get.mockResolvedValue(null)
    prisma.matches.findUnique.mockResolvedValue({ status_short: '2H' })

    expect(await errorCode(send())).toBe('RATE_LIMIT')
    expect(prisma.matches.findUnique).toHaveBeenCalledWith({
      where: { id: 'match-1' },
      select: { status_short: true },
    })
    expect(redis.set).toHaveBeenCalledWith(
      'match:match-1:status',
      '2H',
      'EX',
      30,
    )
  })

  it('Con caché no debe consultar la base', async () => {
    redis.get.mockResolvedValue('1H')

    await send().catch(() => undefined)

    expect(prisma.matches.findUnique).not.toHaveBeenCalled()
  })

  it('Debe rechazar si el partido no existe', async () => {
    redis.get.mockResolvedValue(null)
    prisma.matches.findUnique.mockResolvedValue(null)

    expect(await errorCode(send())).toBe('MATCH_INACTIVE')
    expect(redis.set).not.toHaveBeenCalled()
  })

  describe('actualizaciones en vivo', () => {
    const emit = jest.fn()
    let onMessage: (message: string) => void

    beforeEach(async () => {
      redisService.subscribe.mockImplementation(
        (_channel: string, cb: (message: string) => void) => {
          onMessage = cb
          return Promise.resolve()
        },
      )
      gateway.server = { to: jest.fn(() => ({ emit })) } as never
      await gateway.onApplicationBootstrap()
    })

    const publish = (type: string, status: string) =>
      onMessage(
        JSON.stringify({
          matchId: 'match-1',
          type,
          payload: { home_goals: 1, away_goals: 0, status, elapsed: 50 },
        }),
      )

    it('Debe mandar el estado del chat en match_live_update', () => {
      publish('MINUTE_TICK', '2H')

      expect(emit).toHaveBeenCalledWith(
        'match_live_update',
        expect.objectContaining({ chatState: 'OPEN', chatActive: true }),
      )
    })

    it('Debe avisar el fin del partido con el chat cerrado', () => {
      publish('MATCH_ENDED', 'FT')

      expect(emit).toHaveBeenCalledWith(
        'match_live_update',
        expect.objectContaining({
          type: 'MATCH_ENDED',
          status: 'FT',
          chatState: 'CLOSED',
          chatActive: false,
        }),
      )
    })

    it('Debe avisar la suspensión con el chat pausado', () => {
      publish('MINUTE_TICK', 'SUSP')

      expect(emit).toHaveBeenCalledWith(
        'match_live_update',
        expect.objectContaining({ chatState: 'PAUSED', chatActive: false }),
      )
    })

    it('Debe mandar el marcador de la tanda en match_live_update', () => {
      onMessage(
        JSON.stringify({
          matchId: 'match-1',
          type: 'SCORE_UPDATED',
          payload: {
            home_goals: 1,
            away_goals: 1,
            home_penalty_goals: 3,
            away_penalty_goals: 2,
            status: 'P',
            elapsed: 120,
          },
        }),
      )

      expect(emit).toHaveBeenCalledWith(
        'match_live_update',
        expect.objectContaining({
          hp: 3,
          ap: 2,
          status: 'P',
          chatState: 'OPEN',
        }),
      )
    })

    it('Debe mandar null como marcador de la tanda si no hubo penales', () => {
      publish('SCORE_UPDATED', '2H')

      expect(emit).toHaveBeenCalledWith(
        'match_live_update',
        expect.objectContaining({ hp: null, ap: null }),
      )
    })

    it('No debe romperse con un mensaje que no es JSON', () => {
      expect(() => onMessage('no-json')).not.toThrow()
    })

    describe('bot del chat', () => {
      const kick = (detail: string, player: string) => ({
        time: { elapsed: 120, extra: 1 },
        team: { id: 1, name: 'Boca' },
        player: { id: 9, name: player },
        assist: null,
        type: 'Goal',
        detail,
      })
      const eventsUpdated = (newEvents: unknown[]) =>
        onMessage(
          JSON.stringify({
            matchId: 'match-1',
            type: 'EVENTS_UPDATED',
            payload: {
              count: 10,
              lastEvent: newEvents[newEvents.length - 1],
              newEvents,
              status: 'P',
            },
          }),
        )
      const botMessages = () =>
        (emit.mock.calls as unknown[][])
          .filter((c) => c[0] === 'on-message')
          .map((c) => (c[1] as { message: string }).message)

      beforeEach(() => {
        Object.assign(redis, {
          rpush: jest.fn().mockResolvedValue(1),
          ltrim: jest.fn().mockResolvedValue('OK'),
        })
      })

      it('Debe cargar a cada pateador que erra, aunque lleguen dos tiros juntos', async () => {
        eventsUpdated([
          kick('Missed Penalty', 'Zenón'),
          kick('Penalty', 'Blanco'),
          kick('Missed Penalty', 'Gómez'),
        ])
        await new Promise((r) => setImmediate(r))

        const messages = botMessages()
        expect(messages).toHaveLength(2)
        expect(messages.some((m) => /GOL/i.test(m))).toBe(false)
        expect(emit).not.toHaveBeenCalledWith('goal_scored', expect.anything())
      })

      it('Debe anunciar un gol del partido con goal_scored', async () => {
        eventsUpdated([
          {
            ...kick('Normal Goal', 'Cavani'),
            time: { elapsed: 70, extra: null },
          },
        ])
        await new Promise((r) => setImmediate(r))

        expect(emit).toHaveBeenCalledWith(
          'goal_scored',
          expect.objectContaining({ matchId: 'match-1', player: 'Cavani' }),
        )
        expect(botMessages()).toHaveLength(1)
      })
    })
  })
})
