import { NotFoundException } from '@nestjs/common'
import { WsException } from '@nestjs/websockets'
import { FixtureLeagueGateway } from './fixture.gateway'

describe('FixtureLeagueGateway', () => {
  const redisService = { subscribe: jest.fn() }
  const competitions = {
    resolveCurrent: jest.fn(),
    findCurrentByCacheKey: jest.fn(),
  }
  const client = { id: 'socket-1', join: jest.fn(), leave: jest.fn() }
  let gateway: FixtureLeagueGateway

  beforeEach(() => {
    jest.clearAllMocks()
    gateway = new FixtureLeagueGateway(
      redisService as never,
      competitions as never,
    )
  })

  describe('join_competition', () => {
    it('Debe entrar a la sala de una competición con temporada actual', async () => {
      competitions.resolveCurrent.mockResolvedValue({ slug: 'copa-argentina' })

      const ack = await gateway.handleJoinCompetition(client as never, {
        slug: 'copa-argentina',
      })

      expect(competitions.resolveCurrent).toHaveBeenCalledWith('copa-argentina')
      expect(client.join).toHaveBeenCalledWith('competition_copa-argentina')
      expect(ack).toEqual({ status: 'ok' })
    })

    it.each([
      { slug: 'no-existe' },
      { slug: 'league_128' },
      { slug: 123 },
      {},
      null,
    ])('No debe entrar a ninguna sala con %j', async (data) => {
      competitions.resolveCurrent.mockRejectedValue(
        new NotFoundException('Competición no encontrada'),
      )

      await expect(
        gateway.handleJoinCompetition(client as never, data as never),
      ).rejects.toThrow(WsException)
      expect(client.join).not.toHaveBeenCalled()
    })
  })

  describe('join_league (alias)', () => {
    it('Debe entrar a la sala vieja de una competición real', async () => {
      competitions.findCurrentByCacheKey.mockResolvedValue({
        slug: 'liga-profesional',
      })

      await gateway.handleJoinLeague(client as never, { leagueId: '128' })

      expect(competitions.findCurrentByCacheKey).toHaveBeenCalledWith('128')
      expect(client.join).toHaveBeenCalledWith('league_128')
    })

    it.each([{ leagueId: 'cualquier-sala' }, { leagueId: { a: 1 } }, {}, null])(
      'No debe entrar con %j',
      async (data) => {
        competitions.findCurrentByCacheKey.mockResolvedValue(null)

        await expect(
          gateway.handleJoinLeague(client as never, data as never),
        ).rejects.toThrow(WsException)
        expect(client.join).not.toHaveBeenCalled()
      },
    )
  })

  describe('actualizaciones en vivo', () => {
    const emit = jest.fn()
    const to = jest.fn(() => ({ emit }))
    let onMessage: (message: string) => void

    beforeEach(async () => {
      redisService.subscribe.mockImplementation(
        (_channel: string, cb: (message: string) => void) => {
          onMessage = cb
          return Promise.resolve()
        },
      )
      gateway.server = { to } as never
      await gateway.onApplicationBootstrap()
    })

    const match = JSON.stringify({
      home_goals: 1,
      away_goals: 0,
      status_short: '2H',
      elapsed: 60,
      round: 'Round of 64',
    })

    it('Debe emitir una sola vez a la sala nueva y a la vieja', () => {
      onMessage(
        JSON.stringify({
          leagueId: 128,
          slug: 'liga-profesional',
          matches: { m1: match },
        }),
      )

      expect(redisService.subscribe).toHaveBeenCalledWith(
        'league_live_updates',
        expect.any(Function),
      )
      expect(to).toHaveBeenCalledTimes(1)
      expect(to).toHaveBeenCalledWith([
        'league_128',
        'competition_liga-profesional',
      ])
      expect(emit).toHaveBeenCalledWith(
        'on_league_update',
        expect.objectContaining({
          m1: expect.objectContaining({ h: 1, a: 0, status: '2H' }) as unknown,
        }),
      )
    })

    it('Sin slug debe emitir solo a la sala vieja', () => {
      onMessage(JSON.stringify({ leagueId: 128, matches: { m1: match } }))

      expect(to).toHaveBeenCalledWith(['league_128'])
    })
  })
})
