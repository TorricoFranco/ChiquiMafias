import { FootballFixture } from '../football.types'
import { nameScore, normalizeName } from './name-match'
import { DbMatch, DbTeam, planLinks } from './plan-links'

const team = (
  id: string,
  name: string,
  linkedExternalId: number | null = null,
): DbTeam => ({ id, name, linkedExternalId })

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

describe('planLinks: partidos', () => {
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

  it('Debe comparar contra la ronda traducida por la estrategia del formato', () => {
    const plan = planLinks(
      teams,
      [dbMatch('m1', 't1', 't2', '2026-03-01T20:00:00Z', 'Regular Season - 9')],
      [
        source(
          900,
          [10, 'Boca Juniors'],
          [20, 'River Plate'],
          '2026-05-01T20:00:00Z',
          'Apertura - 9',
        ),
      ],
      { rounds: ['Regular Season - 9'] },
    )

    expect(plan.matches).toEqual([
      expect.objectContaining({ matchId: 'm1', sameRound: true }),
    ])
  })

  it('Debe proponer para confirmar un equipo con otro nombre que coincide por calendario', () => {
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

    expect(plan.teams.find((t) => t.teamId === 't2')).toBeUndefined()
    expect(plan.teamsToConfirm).toEqual([
      {
        source: expect.objectContaining({ externalId: 20 }) as unknown,
        candidates: [
          expect.objectContaining({ teamId: 't2', reason: 'calendario' }),
        ],
      },
    ])
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

describe('planLinks: equipos (RF-A09 y RF-A10)', () => {
  const copa = (home: [number, string], away: [number, string]) =>
    source(1, home, away, '2026-03-01T20:00:00Z', 'Round of 64')

  it('Debe usar el vínculo existente aunque el nombre sea distinto', () => {
    const plan = planLinks(
      [team('t1', 'Estudiantes L.P.', 450)],
      [],
      [copa([450, 'Estudiantes de La Plata'], [999, 'Club Nuevo'])],
    )

    expect(plan.teams).toEqual([
      expect.objectContaining({
        teamId: 't1',
        externalId: 450,
        how: 'vínculo',
      }),
    ])
  })

  it('Un equipo ya vinculado no debe ser candidato para otro nombre igual', () => {
    const plan = planLinks(
      [team('t1', 'Gimnasia', 434)],
      [],
      [copa([434, 'Gimnasia La Plata'], [777, 'Gimnasia'])],
    )

    expect(plan.teams.map((t) => t.externalId)).toEqual([434])
    expect(plan.teamsToCreate.map((t) => t.source.externalId)).toEqual([777])
  })

  it('Debe vincular solo un nombre exacto y único', () => {
    const plan = planLinks(
      [team('t1', 'Tigre')],
      [],
      [copa([10, 'Club Atlético Tigre'], [20, 'Midland'])],
    )

    expect(plan.teams).toEqual([
      expect.objectContaining({ teamId: 't1', externalId: 10, how: 'nombre' }),
    ])
    expect(plan.teamsToCreate.map((t) => t.name)).toEqual(['Midland'])
  })

  it('Dos equipos de la base con el mismo nombre deben ir a confirmar', () => {
    const plan = planLinks(
      [team('t1', 'San Martín'), team('t2', 'San Martin')],
      [],
      [copa([10, 'San Martín'], [20, 'Midland'])],
    )

    expect(plan.teams).toEqual([])
    expect(plan.teamsToConfirm).toHaveLength(1)
    expect(
      plan.teamsToConfirm[0].candidates.map((c) => c.teamId).sort(),
    ).toEqual(['t1', 't2'])
  })

  it('Dos equipos del proveedor con el mismo nombre deben ir a confirmar', () => {
    const plan = planLinks(
      [team('t1', 'San Martín')],
      [],
      [copa([10, 'San Martín'], [20, 'San Martin'])],
    )

    expect(plan.teams).toEqual([])
    expect(plan.teamsToConfirm.map((t) => t.source.externalId).sort()).toEqual([
      10, 20,
    ])
  })

  it('Un nombre aproximado no debe vincularse solo', () => {
    const plan = planLinks(
      [team('t1', 'Gimnasia L.P.')],
      [],
      [copa([10, 'Gimnasia La Plata'], [20, 'Midland'])],
    )

    expect(plan.teams).toEqual([])
    expect(plan.teamsToConfirm).toEqual([
      {
        source: expect.objectContaining({ externalId: 10 }) as unknown,
        candidates: [
          expect.objectContaining({ teamId: 't1', reason: 'nombre' }),
        ],
      },
    ])
  })

  it('No debe fusionar CA Estudiantes con Estudiantes de La Plata', () => {
    const plan = planLinks(
      [team('t1', 'Estudiantes L.P.')],
      [],
      [copa([10, 'CA Estudiantes'], [20, 'Midland'])],
    )

    expect(plan.teams).toEqual([])
    expect(plan.teamsToConfirm.map((t) => t.source.name)).toEqual([
      'CA Estudiantes',
    ])
  })

  it('Un parecido bajo con un equipo libre debe ir a confirmar, no crearse', () => {
    // En una base sin vincular, crearlo solo duplicaría un club de la Liga.
    const plan = planLinks(
      [team('t1', 'Sarmiento Junin')],
      [],
      [copa([10, 'Sarmiento de Junín de Buenos Aires'], [20, 'Midland'])],
    )

    expect(plan.teamsToConfirm).toEqual([
      expect.objectContaining({
        candidates: [expect.objectContaining({ teamId: 't1' })],
      }),
    ])
    expect(plan.teamsToCreate.map((t) => t.name)).toEqual(['Midland'])
  })

  it('Debe crear un equipo cuyo único parecido ya está vinculado, mostrando el parecido', () => {
    const plan = planLinks(
      [team('t1', 'Gimnasia L.P.', 434)],
      [],
      [copa([434, 'Gimnasia La Plata'], [10, 'Gimnasia Jujuy'])],
    )

    expect(plan.teamsToCreate).toEqual([
      expect.objectContaining({
        name: 'Gimnasia Jujuy',
        closest: expect.objectContaining({ teamId: 't1' }) as unknown,
      }),
    ])
  })

  it('Debe guardar el logo y el país del proveedor para crear el equipo', () => {
    const fixture = copa([10, 'Midland'], [20, 'Atlanta'])
    fixture.home.logo = 'https://img.example/10.png'
    fixture.home.country = 'Argentina'

    const plan = planLinks([], [], [fixture])

    expect(plan.teamsToCreate[0]).toEqual({
      source: {
        externalId: 10,
        name: 'Midland',
        logo: 'https://img.example/10.png',
        country: 'Argentina',
      },
      name: 'Midland',
      closest: null,
    })
  })

  describe('decisiones', () => {
    it('Debe vincular el equipo elegido a mano', () => {
      const plan = planLinks(
        [team('t1', 'Gimnasia L.P.')],
        [],
        [copa([10, 'Gimnasia La Plata'], [20, 'Midland'])],
        { decisions: { 10: { action: 'link', teamId: 't1' } } },
      )

      expect(plan.teams).toEqual([
        expect.objectContaining({ teamId: 't1', how: 'confirmado' }),
      ])
      expect(plan.teamsToConfirm).toEqual([])
    })

    it('Debe crear con el nombre corregido', () => {
      const plan = planLinks(
        [],
        [],
        [copa([10, 'CA Estudiantes'], [20, 'Midland'])],
        {
          decisions: {
            10: { action: 'create', name: ' Estudiantes de Buenos Aires ' },
          },
        },
      )

      expect(plan.teamsToCreate.map((t) => t.name)).toEqual([
        'Estudiantes de Buenos Aires',
        'Midland',
      ])
    })

    it('Debe saltear el equipo y dejar pendiente el que no tiene decisión', () => {
      const plan = planLinks(
        [team('t1', 'Gimnasia L.P.')],
        [],
        [copa([10, 'Gimnasia La Plata'], [20, 'Midland'])],
        { decisions: { 10: { action: 'pending' }, 20: { action: 'skip' } } },
      )

      expect(plan.teamsSkipped.map((t) => t.externalId)).toEqual([20])
      expect(plan.teamsToConfirm.map((t) => t.source.externalId)).toEqual([10])
    })

    it('Debe rechazar vincular a un equipo ya vinculado a otro ID', () => {
      const plan = planLinks(
        [team('t1', 'Gimnasia L.P.', 434)],
        [],
        [copa([10, 'Gimnasia La Plata'], [20, 'Midland'])],
        { decisions: { 10: { action: 'link', teamId: 't1' } } },
      )

      expect(plan.teams.map((t) => t.externalId)).not.toContain(10)
      expect(plan.decisionErrors).toEqual([
        expect.stringContaining('ya está vinculado a 434'),
      ])
    })

    it('Debe rechazar elegir el mismo equipo para dos IDs', () => {
      const plan = planLinks(
        [team('t1', 'San Martín')],
        [],
        [copa([10, 'San Martín'], [20, 'San Martin'])],
        {
          decisions: {
            10: { action: 'link', teamId: 't1' },
            20: { action: 'link', teamId: 't1' },
          },
        },
      )

      expect(plan.teams).toEqual([
        expect.objectContaining({ teamId: 't1', externalId: 10 }),
      ])
      expect(plan.decisionErrors).toEqual([
        expect.stringContaining('ya fue elegido'),
      ])
    })

    it('Debe rechazar un equipo que no existe', () => {
      const plan = planLinks([], [], [copa([10, 'Midland'], [20, 'Atlanta'])], {
        decisions: { 10: { action: 'link', teamId: 'no-existe' } },
      })

      expect(plan.decisionErrors).toEqual([
        expect.stringContaining('no existe el equipo no-existe'),
      ])
    })
  })
})
