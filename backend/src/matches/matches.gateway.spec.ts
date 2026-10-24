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
  })
})
