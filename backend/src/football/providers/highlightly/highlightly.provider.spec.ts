import { HighlightlyProvider } from './highlightly.provider'
import { HighlightlyHttp } from './highlightly.http'

const team = (id: number) => ({ id, name: `Equipo ${id}`, logo: `${id}.png` })

const hlMatch = (id: number, date: string, description = 'Finished') => ({
  id,
  round: 'Clausura - 13',
  date,
  homeTeam: team(1),
  awayTeam: team(2),
  league: { id: 109712, season: 2026 },
  state: {
    clock: description === 'Not started' ? null : 90,
    score: {
      current: description === 'Not started' ? null : '1 - 0',
      penalties: null,
    },
    description,
  },
})

describe('HighlightlyProvider', () => {
  const get = jest.fn()
  let provider: HighlightlyProvider

  beforeEach(() => {
    get.mockReset()
    provider = new HighlightlyProvider({ get } as unknown as HighlightlyHttp)
  })

  it('Debe refrescar el live cada 60 s', () => {
    expect(provider.liveRefreshMs).toBe(60_000)
    expect(provider.name).toBe('highlightly')
  })

  describe('getFixtures', () => {
    it('Debe paginar la temporada y recortar la ventana de fechas', async () => {
      get
        .mockResolvedValueOnce({
          status: 200,
          data: {
            data: [
              hlMatch(1, '2026-10-01T20:00:00.000Z'),
              hlMatch(2, '2026-10-12T20:00:00.000Z'),
            ],
            pagination: { totalCount: 3, offset: 0, limit: 2 },
          },
        })
        .mockResolvedValueOnce({
          status: 200,
          data: {
            data: [hlMatch(3, '2026-10-20T20:00:00.000Z')],
            pagination: { totalCount: 3, offset: 100, limit: 100 },
          },
        })
        // detalles de los dos partidos dentro de la ventana
        .mockResolvedValue({
          status: 200,
          data: [
            {
              ...hlMatch(0, '2026-10-12T20:00:00.000Z'),
              venue: { name: 'Estadio X', city: 'Ciudad', capacity: '1000' },
              referee: { name: 'Árbitro' },
            },
          ],
        })

      const result = await provider.getFixtures({
        leagueExternalId: 109712,
        season: 2026,
        from: '2026-10-10',
        to: '2026-10-25',
      })

      expect(get).toHaveBeenNthCalledWith(1, '/matches', {
        leagueId: 109712,
        season: 2026,
        limit: 100,
        offset: 0,
      })
      expect(get).toHaveBeenNthCalledWith(
        2,
        '/matches',
        expect.objectContaining({ offset: 100 }),
      )
      expect(result.map((f) => f.externalId)).toEqual([2, 3])
      expect(result[0].venue?.name).toBe('Estadio X')
      expect(result[0].referee).toBe('Árbitro')
    })

    it('No debe repetir el pedido de detalle de un partido ya conocido', async () => {
      const page = {
        status: 200,
        data: {
          data: [hlMatch(2, '2026-10-12T20:00:00.000Z')],
          pagination: { totalCount: 1, offset: 0, limit: 100 },
        },
      }
      get.mockImplementation((url: string) =>
        Promise.resolve(
          url === '/matches'
            ? page
            : {
                status: 200,
                data: [
                  {
                    ...hlMatch(2, '2026-10-12T20:00:00.000Z'),
                    venue: { name: 'E' },
                  },
                ],
              },
        ),
      )
      const params = {
        leagueExternalId: 109712,
        season: 2026,
        from: '2026-10-10',
        to: '2026-10-25',
      }

      await provider.getFixtures(params)
      await provider.getFixtures(params)

      const detailCalls = get.mock.calls.filter(([url]) => url === '/matches/2')
      expect(detailCalls).toHaveLength(1)
    })

    it('Debe seguir sin estadio si falla el pedido de detalle', async () => {
      get.mockImplementation((url: string) =>
        url === '/matches'
          ? Promise.resolve({
              status: 200,
              data: {
                data: [hlMatch(2, '2026-10-12T20:00:00.000Z')],
                pagination: { totalCount: 1, offset: 0, limit: 100 },
              },
            })
          : Promise.resolve({ status: 500, data: {} }),
      )

      const result = await provider.getFixtures({
        leagueExternalId: 109712,
        season: 2026,
        from: '2026-10-10',
        to: '2026-10-25',
      })

      expect(result).toHaveLength(1)
      expect(result[0].venue).toBeNull()
    })
  })

  describe('getLiveFixtures', () => {
    it('Debe devolver los partidos que ya empezaron (terminados incluidos)', async () => {
      get.mockResolvedValue({
        status: 200,
        data: {
          data: [
            hlMatch(1, '2026-10-20T20:00:00.000Z', 'Second half'),
            hlMatch(2, '2026-10-20T18:00:00.000Z', 'Finished'),
            hlMatch(3, '2026-10-20T23:00:00.000Z', 'Not started'),
            hlMatch(4, '2026-10-20T23:00:00.000Z', 'Postponed'),
          ],
          pagination: { totalCount: 4, offset: 0, limit: 100 },
        },
      })

      const result = await provider.getLiveFixtures(109712)

      expect(result.map((f) => f.externalId)).toEqual([1, 2])
      expect(get).toHaveBeenCalledWith(
        '/matches',
        expect.objectContaining({
          leagueId: 109712,
          date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) as string,
        }),
      )
    })
  })

  describe('errores', () => {
    it('Debe devolver listas vacías ante un 404 (sin datos todavía)', async () => {
      get.mockResolvedValue({ status: 404, data: {} })

      await expect(provider.getLineups(1)).resolves.toEqual([])
      await expect(provider.getMatchStatistics(1)).resolves.toEqual([])
      await expect(provider.getEvents(1)).resolves.toEqual([])
      await expect(provider.getFixture(1)).resolves.toBeNull()
    })

    it('Debe lanzar un error claro ante un 429 o un 5xx', async () => {
      get.mockResolvedValue({ status: 429, data: {} })

      await expect(provider.getEvents(1)).rejects.toThrow(
        'Highlightly respondió 429 en /events/1',
      )
    })
  })

  describe('otros endpoints', () => {
    it('Debe aplanar los grupos de la tabla de posiciones', async () => {
      const row = (position: number) => ({
        team: team(position),
        position,
        points: 10,
        total: {
          games: 5,
          wins: 3,
          draws: 1,
          loses: 1,
          scoredGoals: 6,
          receivedGoals: 4,
        },
      })
      get.mockResolvedValue({
        status: 200,
        data: {
          groups: [
            { name: 'Apertura - Group A', standings: [row(1)] },
            { name: 'Clausura - Group B', standings: [row(2)] },
          ],
        },
      })

      const rows = await provider.getStandings(109712, 2026)

      expect(get).toHaveBeenCalledWith('/standings', {
        leagueId: 109712,
        season: 2026,
      })
      expect(rows.map((r) => r.group)).toEqual([
        'Apertura - Group A',
        'Clausura - Group B',
      ])
    })

    it('Debe sacar los equipos de la tabla de posiciones, sin repetir', async () => {
      const row = (id: number) => ({
        team: team(id),
        position: 1,
        points: 1,
        total: {
          games: 1,
          wins: 0,
          draws: 1,
          loses: 0,
          scoredGoals: 0,
          receivedGoals: 0,
        },
      })
      get.mockResolvedValue({
        status: 200,
        data: {
          groups: [
            { name: 'Apertura - Group A', standings: [row(1), row(2)] },
            { name: 'Clausura - Group A', standings: [row(1), row(2)] },
          ],
        },
      })

      const teams = await provider.getTeams(109712, 2026)

      expect(teams.map((t) => t.team.externalId)).toEqual([1, 2])
    })

    it('Debe pedir el head to head y el historial reciente con los parámetros de Highlightly', async () => {
      get.mockResolvedValue({
        status: 200,
        data: [
          hlMatch(1, '2026-01-01T20:00:00.000Z'),
          hlMatch(2, '2026-02-01T20:00:00.000Z'),
          hlMatch(3, '2026-03-01T20:00:00.000Z'),
        ],
      })

      const h2h = await provider.getHeadToHead(1, 2, 2)
      const recent = await provider.getRecentFinishedFixtures(1, 5)

      expect(get).toHaveBeenNthCalledWith(1, '/head-2-head', {
        teamIdOne: 1,
        teamIdTwo: 2,
      })
      expect(get).toHaveBeenNthCalledWith(2, '/last-five-games', { teamId: 1 })
      expect(h2h).toHaveLength(2)
      expect(recent).toHaveLength(3)
    })
  })
})
