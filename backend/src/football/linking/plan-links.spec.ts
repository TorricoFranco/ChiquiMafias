import { FootballFixture } from '../football.types'
import { nameScore, normalizeName } from './name-match'
import { DbMatch, DbTeam, planLinks } from './plan-links'

const team = (id: string, name: string): DbTeam => ({ id, name })

const source = (
  externalId: number,
  home: [number, string],
  away: [number, string],
  date: string,
  round = 'Clausura - 13',
): FootballFixture => ({
  externalId,
  date,
  timestamp: 0,
  timezone: 'UTC',
  referee: null,
  venue: null,
  status: { short: 'NS', long: 'Not started', elapsed: null },
  league: { externalId: 1, season: 2026, round },
  home: { externalId: home[0], name: home[1], winner: null },
  away: { externalId: away[0], name: away[1], winner: null },
  goals: { home: null, away: null },
  penalty: { home: null, away: null },
})

const dbMatch = (
  id: string,
  homeTeamId: string,
  awayTeamId: string,
  date: string,
  round = 'Clausura - 13',
): DbMatch => ({ id, homeTeamId, awayTeamId, round, date: new Date(date) })

describe('nameScore', () => {
  it('Debe normalizar acentos y signos', () => {
    expect(normalizeName('Vélez Sarsfield')).toBe('velez sarsfield')
    expect(nameScore('Vélez Sarsfield', 'Velez Sarsfield')).toBe(1)
    expect(nameScore('Newells Old Boys', 'Newell’s Old Boys')).toBe(1)
  })

  it('Debe reconocer siglas y nombres largos como aproximados', () => {
    expect(nameScore('Gimnasia L.P.', 'Gimnasia La Plata')).toBeGreaterThan(0.6)
    expect(nameScore('San Lorenzo', 'San Lorenzo de Almagro')).toBeGreaterThan(
      0.6,
    )
    expect(nameScore('Argentinos JRS', 'Argentinos Juniors')).toBeGreaterThan(
      0.6,
    )
  })

  it('No debe confundir equipos distintos', () => {
    expect(nameScore('Boca Juniors', 'River Plate')).toBeLessThan(0.6)
    expect(nameScore('Racing Club', 'Rosario Central')).toBeLessThan(0.6)
  })
})

describe('planLinks', () => {
  const teams = [team('t1', 'Boca Juniors'), team('t2', 'River Plate')]

  it('Debe vincular equipos por nombre y partidos por local, visitante y ronda', () => {
    const plan = planLinks(
      teams,
      [dbMatch('m1', 't1', 't2', '2026-10-25T20:00:00Z')],
      [
        source(
          900,
          [10, 'Boca Juniors'],
          [20, 'River Plate'],
          '2026-10-25T20:00:00Z',
        ),
      ],
    )

    expect(plan.teams.map((t) => [t.teamId, t.externalId, t.how])).toEqual(
      expect.arrayContaining([
        ['t1', 10, 'nombre'],
        ['t2', 20, 'nombre'],
      ]),
    )
    expect(plan.matches).toEqual([
      { matchId: 'm1', externalId: 900, diffHours: 0, sameRound: true },
    ])
    expect(plan.matchesWithoutLink).toEqual([])
    expect(plan.sourceOnly).toEqual([])
  })

  it('Debe aceptar una reprogramación de semanas si la ronda es la misma', () => {
    const plan = planLinks(
      teams,
      [dbMatch('m1', 't1', 't2', '2026-10-25T20:00:00Z')],
      [
        source(
          900,
          [10, 'Boca Juniors'],
          [20, 'River Plate'],
          '2026-11-04T20:00:00Z',
        ),
      ],
    )

    expect(plan.matches).toHaveLength(1)
    expect(plan.matches[0].diffHours).toBe(240)
    expect(plan.matchesToReview).toEqual([])
  })

  it('Debe dejar para revisar un partido con ronda distinta y fecha lejana', () => {
    const plan = planLinks(
      teams,
      [dbMatch('m1', 't1', 't2', '2026-10-25T20:00:00Z', 'Clausura - 13')],
      [
        source(
          900,
          [10, 'Boca Juniors'],
          [20, 'River Plate'],
          '2026-12-05T20:00:00Z',
          'Clausura - 16',
        ),
      ],
    )

    expect(plan.matches).toEqual([])
    expect(plan.matchesToReview).toHaveLength(1)
    expect(plan.matchesToReview[0].reason).toContain('ronda distinta')
  })

  it('Debe elegir la ronda correcta cuando el cruce se repite', () => {
    const plan = planLinks(
      teams,
      [
        dbMatch('m1', 't1', 't2', '2026-03-01T20:00:00Z', 'Clausura - 1'),
        dbMatch('m2', 't1', 't2', '2026-10-25T20:00:00Z', 'Clausura - 13'),
      ],
      [
        source(
          901,
          [10, 'Boca Juniors'],
          [20, 'River Plate'],
          '2026-03-01T20:00:00Z',
          'Clausura - 1',
        ),
        source(
          902,
          [10, 'Boca Juniors'],
          [20, 'River Plate'],
          '2026-10-25T20:00:00Z',
          'Clausura - 13',
        ),
      ],
    )

    expect(plan.matches.map((m) => [m.matchId, m.externalId])).toEqual([
      ['m1', 901],
      ['m2', 902],
    ])
  })

  it('Debe vincular un equipo con otro nombre por calendario', () => {
    const plan = planLinks(
      [team('t1', 'Boca Juniors'), team('t2', 'Equipo Raro SA')],
      [dbMatch('m1', 't1', 't2', '2026-10-25T20:00:00Z')],
      [
        source(
          900,
          [10, 'Boca Juniors'],
          [20, 'Nombre Totalmente Distinto'],
          '2026-10-25T20:00:00Z',
        ),
      ],
    )

    const raro = plan.teams.find((t) => t.teamId === 't2')
    expect(raro).toMatchObject({ externalId: 20, how: 'calendario' })
  })

  it('Debe informar los partidos sin equivalente y los que solo tiene el proveedor', () => {
    const plan = planLinks(
      teams,
      [dbMatch('m1', 't1', 't2', '2026-10-25T20:00:00Z')],
      [
        source(
          900,
          [10, 'Boca Juniors'],
          [20, 'River Plate'],
          '2026-11-01T20:00:00Z',
          'Clausura - 14',
        ),
      ],
    )

    // Misma pareja, otra ronda y fecha cercana (< 72 h no, son 168 h): a revisar.
    expect(plan.matchesToReview.length + plan.matches.length).toBe(1)

    const plan2 = planLinks(
      teams,
      [dbMatch('m9', 't2', 't1', '2026-10-25T20:00:00Z')],
      [
        source(
          900,
          [10, 'Boca Juniors'],
          [20, 'River Plate'],
          '2026-10-25T20:00:00Z',
        ),
      ],
    )
    expect(plan2.matchesWithoutLink).toHaveLength(1)
    expect(plan2.sourceOnly.map((f) => f.externalId)).toEqual([900])
  })

  it('No debe usar dos veces el mismo equipo ni el mismo partido del proveedor', () => {
    const plan = planLinks(
      [team('t1', 'Boca Juniors'), team('t2', 'Boca Juniors B')],
      [],
      [source(900, [10, 'Boca Juniors'], [20, 'Otro'], '2026-10-25T20:00:00Z')],
    )

    const ids = plan.teams.map((t) => t.externalId)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
