import { PrematchTrackerService } from './prematch-tracker.cron'

describe('PrematchTrackerService', () => {
  const prisma = {
    matches: { findMany: jest.fn(), updateMany: jest.fn() },
  }
  let service: PrematchTrackerService

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers().setSystemTime(new Date('2026-10-23T20:00:00.000Z'))
    service = new PrematchTrackerService(prisma as never)
  })

  afterEach(() => jest.useRealTimers())

  it('Debe marcar los partidos que empiezan en 30 minutos o menos', async () => {
    prisma.matches.findMany.mockResolvedValue([
      {
        id: 'm1',
        api_fixture_id: 1,
        home_team: { name: 'Boca' },
        away_team: { name: 'River' },
      },
    ])

    await service.trackUpcomingMatches()

    expect(prisma.matches.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['m1'] } },
      data: { tracked: true },
    })
  })

  it('Debe acotar la búsqueda a las últimas 24 horas y los próximos 30 minutos', async () => {
    prisma.matches.findMany.mockResolvedValue([])

    await service.trackUpcomingMatches()

    const { where } = (
      prisma.matches.findMany.mock.calls as unknown[][]
    )[0][0] as {
      where: { tracked: boolean; date: { gte: Date; lte: Date } }
    }
    expect(where.tracked).toBe(false)
    expect(where.date.gte.toISOString()).toBe('2026-10-22T20:00:00.000Z')
    expect(where.date.lte.toISOString()).toBe('2026-10-23T20:30:00.000Z')
  })

  it('No debe escribir nada si no hay partidos por marcar', async () => {
    prisma.matches.findMany.mockResolvedValue([])

    await service.trackUpcomingMatches()

    expect(prisma.matches.updateMany).not.toHaveBeenCalled()
  })
})
