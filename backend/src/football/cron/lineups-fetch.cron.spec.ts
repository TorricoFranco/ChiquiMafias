import { Logger } from '@nestjs/common'
import { LineupsFetchCron } from './lineups-fetch.cron'

const NOW = new Date('2026-10-25T17:45:00.000Z')

const match = (minutesToStart: number, id = 'm1') => ({
  id,
  api_fixture_id: null,
  date: new Date(NOW.getTime() + minutesToStart * 60_000),
  home_team: { name: 'Aldosivi' },
  away_team: { name: 'Belgrano' },
})

describe('LineupsFetchCron', () => {
  const prisma = { matches: { findMany: jest.fn() } }
  const provider = { getLineups: jest.fn() }
  const redisService = { redis: { del: jest.fn() }, publish: jest.fn() }
  const refs = { matchExternalIds: jest.fn() }
  let cron: LineupsFetchCron
  let warn: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers({ now: NOW })
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {})
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {})
    prisma.matches.findMany.mockResolvedValue([match(5)])
    refs.matchExternalIds.mockResolvedValue(new Map([['m1', 1493197]]))
    provider.getLineups.mockResolvedValue([])
    cron = new LineupsFetchCron(
      prisma as never,
      provider as never,
      redisService as never,
      refs as never,
    )
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('Debe consultar solo partidos marcados, sin alineación y de las últimas 6 horas', async () => {
    await cron.fetchLineups()

    expect(prisma.matches.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tracked: true,
          lineup_fetched: false,
          date: { gte: new Date(NOW.getTime() - 6 * 60 * 60_000) },
        },
      }),
    )
  })

  it('Debe avisar una sola vez que faltan alineaciones cuando falta poco para el inicio', async () => {
    await cron.fetchLineups()
    await cron.fetchLineups()

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'Faltan 5 min para Aldosivi vs Belgrano',
      ) as unknown,
    )
  })

  it('No debe avisar si todavía falta tiempo para el inicio', async () => {
    prisma.matches.findMany.mockResolvedValue([match(30)])

    await cron.fetchLineups()

    expect(warn).not.toHaveBeenCalled()
  })

  it('Debe avisar distinto si el partido ya empezó sin alineaciones', async () => {
    prisma.matches.findMany.mockResolvedValue([match(-3)])

    await cron.fetchLineups()

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Empezó hace 3 min') as unknown,
    )
  })

  it('No debe avisar si el proveedor ya devolvió alineaciones', async () => {
    provider.getLineups.mockResolvedValue([
      {
        team: { externalId: 1, name: 'Aldosivi' },
        startXI: [{}],
        substitutes: [],
      },
    ])
    // La persistencia de la alineación está fuera de este caso: corta antes de guardar.
    ;(cron as unknown as { prisma: unknown }).prisma = {
      ...prisma,
      $transaction: jest.fn().mockResolvedValue(undefined),
    }

    await cron.fetchLineups()

    expect(warn).not.toHaveBeenCalled()
  })
})
