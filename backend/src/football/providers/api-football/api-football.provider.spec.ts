import { ApiFootballProvider } from './api-football.provider'
import { ApiFootballHttp } from './api-football.http'

const rawFixture = {
  fixture: {
    id: 1001,
    date: '2026-03-01T20:00:00+00:00',
    timestamp: 1772395200,
    timezone: 'UTC',
    referee: null,
    status: { short: '2H', long: 'Second Half', elapsed: 67 },
    venue: { id: 7, name: 'La Bombonera', city: 'Buenos Aires' },
  },
  league: { id: 128, season: 2026, round: 'Apertura - 9' },
  teams: {
    home: { id: 451, name: 'Boca Juniors', logo: 'b.png', winner: null },
    away: { id: 435, name: 'River Plate', logo: 'r.png', winner: null },
  },
  goals: { home: 1, away: 0 },
  score: { penalty: { home: null, away: null } },
}

describe('ApiFootballProvider', () => {
  const get = jest.fn()
  let provider: ApiFootballProvider

  beforeEach(() => {
    get.mockReset()
    provider = new ApiFootballProvider({ get } as unknown as ApiFootballHttp)
  })

  it('Debe mapear un fixture al contrato propio', async () => {
    get.mockResolvedValue({ data: { response: [rawFixture] } })

    const [f] = await provider.getFixtures({
      leagueExternalId: 128,
      season: 2026,
      from: '2026-02-20',
      to: '2026-03-08',
    })

    expect(get).toHaveBeenCalledWith('/fixtures', {
      league: 128,
      season: 2026,
      from: '2026-02-20',
      to: '2026-03-08',
    })
    expect(f).toEqual({
      externalId: 1001,
      date: '2026-03-01T20:00:00+00:00',
      timestamp: 1772395200,
      timezone: 'UTC',
      referee: null,
      venue: { externalId: 7, name: 'La Bombonera', city: 'Buenos Aires' },
      status: { short: '2H', long: 'Second Half', elapsed: 67 },
      league: { externalId: 128, season: 2026, round: 'Apertura - 9' },
      home: {
        externalId: 451,
        name: 'Boca Juniors',
        logo: 'b.png',
        code: null,
        country: null,
        founded: null,
        winner: null,
      },
      away: {
        externalId: 435,
        name: 'River Plate',
        logo: 'r.png',
        code: null,
        country: null,
        founded: null,
        winner: null,
      },
      goals: { home: 1, away: 0 },
      penalty: { home: null, away: null },
    })
  })

  it('Debe pedir los partidos en vivo de la liga con live=all', async () => {
    get.mockResolvedValue({ data: { response: [] } })

    await provider.getLiveFixtures(128)

    expect(get).toHaveBeenCalledWith('/fixtures', {
      live: 'all',
      league: 128,
    })
  })

  it('Debe devolver null si el fixture no existe', async () => {
    get.mockResolvedValue({ data: { response: [] } })

    await expect(provider.getFixture(999)).resolves.toBeNull()
  })

  it('Debe mapear eventos, con jugador sin id como null', async () => {
    get.mockResolvedValue({
      data: {
        response: [
          {
            time: { elapsed: 45, extra: 2 },
            team: { id: 451, name: 'Boca Juniors', logo: 'b.png' },
            player: { id: 10, name: 'Cavani' },
            assist: { id: null, name: null },
            type: 'Goal',
            detail: 'Normal Goal',
          },
        ],
      },
    })

    const [e] = await provider.getEvents(1001)

    expect(get).toHaveBeenCalledWith('/fixtures/events', { fixture: 1001 })
    expect(e.minute).toBe(45)
    expect(e.extraMinute).toBe(2)
    expect(e.player).toEqual({ externalId: 10, name: 'Cavani' })
    expect(e.assist).toBeNull()
    expect(e.team?.externalId).toBe(451)
  })

  it('Debe conservar el nombre del jugador aunque el proveedor no mande id', async () => {
    get.mockResolvedValue({
      data: {
        response: [
          {
            time: { elapsed: 10, extra: null },
            team: { id: 451, name: 'Boca Juniors' },
            player: { id: null, name: 'Cavani' },
            assist: null,
            type: 'Goal',
            detail: 'Normal Goal',
          },
        ],
      },
    })

    const [e] = await provider.getEvents(1001)

    expect(e.player).toEqual({ externalId: null, name: 'Cavani' })
  })

  it('Debe normalizar las claves de estadísticas a snake_case', async () => {
    get.mockResolvedValue({
      data: {
        response: [
          {
            team: { id: 451, name: 'Boca Juniors', logo: 'b.png' },
            statistics: [
              { type: 'Shots on Goal', value: 5 },
              { type: 'Ball Possession', value: '55%' },
              { type: null, value: 1 },
            ],
          },
        ],
      },
    })

    const [s] = await provider.getMatchStatistics(1001)

    expect(s.statistics).toEqual({ shots_on_goal: 5, ball_possession: '55%' })
  })

  it('Debe aplanar la tabla de posiciones de todos los grupos', async () => {
    const row = (rank: number, group: string) => ({
      rank,
      team: { id: rank, name: `Equipo ${rank}`, logo: 'x.png' },
      points: 10,
      goalsDiff: 2,
      group,
      form: 'WDL',
      description: null,
      all: {
        played: 5,
        win: 3,
        draw: 1,
        lose: 1,
        goals: { for: 6, against: 4 },
      },
    })
    get.mockResolvedValue({
      data: {
        response: [
          {
            league: {
              standings: [[row(1, 'Apertura, Group A')], [row(2, 'Anual')]],
            },
          },
        ],
      },
    })

    const rows = await provider.getStandings(128, 2026)

    expect(rows.map((r) => r.group)).toEqual(['Apertura, Group A', 'Anual'])
    expect(rows[0]).toMatchObject({
      rank: 1,
      played: 5,
      wins: 3,
      draws: 1,
      losses: 1,
      goalsFor: 6,
      goalsAgainst: 4,
    })
  })

  it('Debe devolver una lista vacía si no hay tabla', async () => {
    get.mockResolvedValue({ data: { response: [] } })

    await expect(provider.getStandings(128, 2026)).resolves.toEqual([])
  })

  it('Debe pedir el h2h con el formato id-id y los últimos N', async () => {
    get.mockResolvedValue({ data: { response: [] } })

    await provider.getHeadToHead(451, 435, 5)

    expect(get).toHaveBeenCalledWith('/fixtures/headtohead', {
      last: 5,
      h2h: '451-435',
    })
  })
})
