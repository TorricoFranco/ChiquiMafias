import { toWireEvent } from '../cron/events-fetch.cron'
import * as af from './api-football/api-football.mappers'
import * as hl from './highlightly/highlightly.mappers'

/**
 * Contrato entre proveedores: API-Football y Highlightly tienen que entregar la
 * misma FORMA de datos, porque el resto del backend (y el front) no sabe cuál
 * está activo. Si alguien cambia un mapper y rompe esto, falla acá.
 */

/** Rutas de todas las propiedades de un objeto, sin importar sus valores. */
function shape(value: unknown, path = ''): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return [path]
  }
  return Object.entries(value as Record<string, unknown>)
    .flatMap(([k, v]) => shape(v, path ? `${path}.${k}` : k))
    .sort()
}

// Códigos de estado que guarda la DB y leen los crons y el front.
const CANONICAL_STATUSES = [
  'TBD',
  'NS',
  '1H',
  'HT',
  '2H',
  'ET',
  'BT',
  'P',
  'LIVE',
  'FT',
  'AET',
  'PEN',
  'PST',
  'SUSP',
  'INT',
  'CANC',
  'ABD',
  'AWD',
  'WO',
]

// Claves de estadísticas que lee new_frontend/features/matches (MatchStats).
const FRONT_STAT_KEYS = [
  'ball_possession',
  'blocked_shots',
  'corner_kicks',
  'expected_goals',
  'fouls',
  'goalkeeper_saves',
  'offsides',
  'passes_%',
  'passes_accurate',
  'red_cards',
  'shots_insidebox',
  'shots_off_goal',
  'shots_on_goal',
  'shots_outsidebox',
  'total_passes',
  'total_shots',
  'yellow_cards',
]

const afFixture = {
  fixture: {
    id: 1,
    date: '2026-10-25T20:00:00+00:00',
    timestamp: 1793000000,
    timezone: 'UTC',
    referee: 'Árbitro',
    status: { short: 'FT', long: 'Match Finished', elapsed: 90 },
    venue: { id: 7, name: 'Estadio', city: 'Ciudad' },
  },
  league: { id: 128, season: 2026, round: 'Clausura - 14' },
  teams: {
    home: { id: 10, name: 'Local', logo: 'l.png', winner: true },
    away: { id: 20, name: 'Visita', logo: 'v.png', winner: false },
  },
  goals: { home: 2, away: 1 },
  score: { penalty: { home: null, away: null } },
}

const hlFixture = {
  id: 1,
  round: 'Clausura - 14',
  date: '2026-10-25T20:00:00.000Z',
  homeTeam: { id: 10, name: 'Local', logo: 'l.png' },
  awayTeam: { id: 20, name: 'Visita', logo: 'v.png' },
  league: { id: 109712, season: 2026 },
  state: {
    clock: 90,
    score: { current: '2 - 1', penalties: null },
    description: 'Finished',
  },
  venue: { name: 'Estadio', city: 'Ciudad', capacity: '1000' },
  referee: { name: 'Árbitro' },
}

describe('Contrato entre proveedores', () => {
  it('Un partido tiene la misma forma y un estado canónico', () => {
    const a = af.mapFixture(afFixture)
    const h = hl.mapMatch(hlFixture)

    expect(shape(h)).toEqual(shape(a))
    expect(CANONICAL_STATUSES).toContain(a.status.short)
    expect(CANONICAL_STATUSES).toContain(h.status.short)
    expect(h.home.winner).toBe(a.home.winner)
    expect(h.goals).toEqual(a.goals)
    expect(h.status.short).toBe(a.status.short)
  })

  it('Todos los estados de Highlightly son códigos canónicos', () => {
    const descriptions = [
      'To be announced',
      'Not started',
      'First half',
      'Half time',
      'Second half',
      'Extra time',
      'Break time',
      'Penalties',
      'Suspended',
      'Interrupted',
      'Finished',
      'Finished after penalties',
      'Finished after extra time',
      'Postponed',
      'Cancelled',
      'Abandoned',
      'Awarded',
      'In progress',
      'Unknown',
    ]
    for (const d of descriptions) {
      expect(CANONICAL_STATUSES).toContain(hl.mapStatusShort(d))
    }
  })

  it('Un gol tiene la misma forma, y por socket el mismo formato', () => {
    const a = af.mapEvent({
      time: { elapsed: 50, extra: null },
      team: { id: 10, name: 'Local', logo: 'l.png' },
      player: { id: 11, name: 'Goleador' },
      assist: { id: 12, name: 'Asistente' },
      type: 'Goal',
      detail: 'Normal Goal',
    })
    const [h] = hl.mapEvents([
      {
        team: { id: 10, name: 'Local', logo: 'l.png' },
        time: '50',
        type: 'Goal',
        player: 'Goleador',
        playerId: 11,
        assist: 'Asistente',
        assistingPlayerId: 12,
        substituted: null,
      },
    ])

    expect(shape(h)).toEqual(shape(a))
    expect(h.type).toBe(a.type)
    expect(h.detail).toBe(a.detail)
    expect(shape(toWireEvent(h))).toEqual(shape(toWireEvent(a)))
  })

  it('Una tarjeta y una sustitución usan el vocabulario de API-Football', () => {
    const events = hl.mapEvents([
      {
        team: { id: 10, name: 'L' },
        time: '30',
        type: 'Yellow Card',
        player: 'J',
        playerId: 1,
        assist: null,
        assistingPlayerId: null,
        substituted: null,
      },
      {
        team: { id: 10, name: 'L' },
        time: '60',
        type: 'Substitution',
        player: 'Sale',
        playerId: 2,
        assist: null,
        assistingPlayerId: 3,
        substituted: 'Entra',
      },
    ])

    expect(events.map((e) => [e.type, e.detail])).toEqual([
      ['Card', 'Yellow Card'],
      ['subst', 'Substitution 1'],
    ])
  })

  it('El evento por socket nunca lleva detail null (el front hace toLowerCase)', () => {
    const [unknown] = hl.mapEvents([
      {
        team: { id: 10, name: 'L' },
        time: '10',
        type: 'Algo Nuevo',
        player: 'J',
        playerId: 1,
        assist: null,
        assistingPlayerId: null,
        substituted: null,
      },
    ])

    expect(unknown.detail).toBeNull()
    expect(typeof toWireEvent(unknown).detail).toBe('string')
    expect(toWireEvent(unknown).detail).toBe('NONE')
  })

  it('Las estadísticas tienen exactamente las claves que lee el front', () => {
    const afNames = [
      'Shots on Goal',
      'Shots off Goal',
      'Total Shots',
      'Blocked Shots',
      'Shots insidebox',
      'Shots outsidebox',
      'Fouls',
      'Corner Kicks',
      'Offsides',
      'Ball Possession',
      'Yellow Cards',
      'Red Cards',
      'Goalkeeper Saves',
      'Total passes',
      'Passes accurate',
      'Passes %',
      'expected_goals',
    ]
    const a = af.mapStatistics({
      team: { id: 10, name: 'Local' },
      statistics: afNames.map((type) => ({ type, value: 1 })),
    })
    const h = hl.mapStatistics({
      team: { id: 10, name: 'Local' },
      statistics: [],
    })

    expect(Object.keys(a.statistics).sort()).toEqual(FRONT_STAT_KEYS)
    expect(Object.keys(h.statistics).sort()).toEqual(FRONT_STAT_KEYS)
  })

  it('Una alineación tiene la misma forma', () => {
    const a = af.mapLineup({
      team: { id: 10, name: 'Local', logo: 'l.png' },
      formation: '4-4-2',
      coach: { name: 'DT' },
      startXI: [
        {
          player: { id: 1, name: 'Arquero', number: 1, pos: 'G', grid: '1:1' },
        },
      ],
      substitutes: [
        {
          player: { id: 2, name: 'Suplente', number: 12, pos: 'M', grid: null },
        },
      ],
    })
    const [h] = hl.mapLineups({
      homeTeam: {
        id: 10,
        name: 'Local',
        logo: 'l.png',
        formation: '4-4-2',
        initialLineup: [
          [{ id: 1, name: 'Arquero', number: 1, position: 'Goalkeeper' }],
        ],
        substitutes: [
          { id: 2, name: 'Suplente', number: 12, position: 'Midfielder' },
        ],
      },
      awayTeam: {
        id: 20,
        name: 'Visita',
        formation: '4-4-2',
        initialLineup: [],
        substitutes: [],
      },
    })

    expect(shape(h.startXI[0])).toEqual(shape(a.startXI[0]))
    expect(h.startXI[0]).toMatchObject({ position: 'G', grid: '1:1' })
    expect(shape(h.substitutes[0])).toEqual(shape(a.substitutes[0]))
    expect(Object.keys(h).sort()).toEqual(
      expect.arrayContaining([
        'team',
        'formation',
        'coachName',
        'startXI',
        'substitutes',
      ]),
    )
  })

  it('Una fila de la tabla tiene la misma forma', () => {
    const a = af.mapStandingRow({
      rank: 1,
      team: { id: 10, name: 'Local', logo: 'l.png' },
      points: 10,
      goalsDiff: 3,
      group: 'Clausura, Group A',
      form: 'WWD',
      description: null,
      all: {
        played: 5,
        win: 3,
        draw: 1,
        lose: 1,
        goals: { for: 6, against: 3 },
      },
    })
    const h = hl.mapStandingRow('Clausura - Group A', {
      team: { id: 10, name: 'Local', logo: 'l.png' },
      position: 1,
      points: 10,
      total: {
        games: 5,
        wins: 3,
        draws: 1,
        loses: 1,
        scoredGoals: 6,
        receivedGoals: 3,
      },
    })

    expect(shape(h)).toEqual(shape(a))
    expect(h.goalsDiff).toBe(a.goalsDiff)
  })
})
