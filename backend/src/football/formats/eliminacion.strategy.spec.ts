import { FootballFixture } from '../football.types'
import {
  eliminacionStrategy,
  KNOCKOUT_ROUNDS,
  resolveKnockoutRounds,
} from './eliminacion.strategy'
import { getFormatStrategy } from './format-registry'

let nextId = 1
const fixture = (round: string, date: string) =>
  ({
    externalId: nextId++,
    date,
    league: { externalId: 111414, season: 2026, round },
  }) as FootballFixture

/** `count` partidos de una ronda, un día después del otro desde `from`. */
const roundOf = (round: string, count: number, from: string) =>
  Array.from({ length: count }, (_, i) =>
    fixture(
      round,
      new Date(new Date(from).getTime() + i * 86_400_000).toISOString(),
    ),
  )

const keysOf = (fixtures: FootballFixture[]) => [
  ...new Set(resolveKnockoutRounds(fixtures).map((r) => r.matchdayKey)),
]

describe('resolveKnockoutRounds', () => {
  it('Debe deducir las seis rondas de 2025 aunque los 32avos se llamen "1st Round"', () => {
    const fixtures = [
      ...roundOf('Final', 1, '2025-11-06'),
      ...roundOf('1st Round', 32, '2025-01-23'),
      ...roundOf('Semi-finals', 2, '2025-10-24'),
      ...roundOf('Round of 32', 16, '2025-05-11'),
      ...roundOf('Quarter-finals', 4, '2025-09-06'),
      ...roundOf('Round of 16', 8, '2025-07-30'),
    ]

    const rounds = resolveKnockoutRounds(fixtures)

    expect(rounds[0]).toEqual({
      round: 'Final',
      tournament: 'ELIMINACION',
      matchdayKey: 'final',
    })
    expect(rounds[1]).toEqual({
      round: '32avos de final',
      tournament: 'ELIMINACION',
      matchdayKey: '32avos',
    })
    const perRound = new Map<string, number>()
    for (const r of rounds) {
      perRound.set(r.matchdayKey, (perRound.get(r.matchdayKey) ?? 0) + 1)
    }
    expect(Object.fromEntries(perRound)).toEqual({
      final: 1,
      '32avos': 32,
      semifinal: 2,
      '16avos': 16,
      cuartos: 4,
      octavos: 8,
    })
  })

  it('Debe deducir 2026 con "Round of 64" y sin la final publicada', () => {
    const fixtures = [
      ...roundOf('Round of 64', 32, '2026-01-18'),
      ...roundOf('Round of 32', 16, '2026-04-22'),
      ...roundOf('Round of 16', 8, '2026-08-12'),
      ...roundOf('Quarter-finals', 4, '2026-09-09'),
      ...roundOf('Semi-finals', 2, '2026-10-29'),
    ]

    expect(keysOf(fixtures)).toEqual([
      '32avos',
      '16avos',
      'octavos',
      'cuartos',
      'semifinal',
    ])
  })

  it('Una semifinal publicada a medias no debe confundirse con la final', () => {
    const fixtures = [
      ...roundOf('Round of 64', 32, '2026-01-18'),
      ...roundOf('Round of 32', 16, '2026-04-22'),
      ...roundOf('Round of 16', 8, '2026-08-12'),
      ...roundOf('Quarter-finals', 4, '2026-09-09'),
      ...roundOf('Semi-finals', 1, '2026-10-29'),
    ]

    expect(keysOf(fixtures).at(-1)).toBe('semifinal')
  })

  it('Una ronda incompleta debe tomar la ronda siguiente a la anterior', () => {
    const fixtures = [
      ...roundOf('Round of 64', 32, '2026-01-18'),
      ...roundOf('Round of 32', 10, '2026-04-22'),
    ]

    expect(keysOf(fixtures)).toEqual(['32avos', '16avos'])
  })

  it('Si faltan las rondas iniciales, la primera se ubica por cantidad', () => {
    const fixtures = [
      ...roundOf('Round of 16', 8, '2026-08-12'),
      ...roundOf('Quarter-finals', 4, '2026-09-09'),
    ]

    expect(keysOf(fixtures)).toEqual(['octavos', 'cuartos'])
  })

  it('Debe agrupar los partidos sin etiqueta como una ronda más', () => {
    const fixtures = [
      ...roundOf('', 32, '2026-01-18'),
      ...roundOf('Round of 32', 16, '2026-04-22'),
    ]

    expect(keysOf(fixtures)).toEqual(['32avos', '16avos'])
  })

  it('Con más etiquetas que rondas, las que sobran quedan como final', () => {
    const labels = KNOCKOUT_ROUNDS.map((_, i) => `R${i}`)
    const fixtures = [
      ...labels.map((l, i) => fixture(l, `2026-0${i + 1}-01T00:00:00Z`)),
      fixture('Extra', '2026-12-01T00:00:00Z'),
    ]

    expect(resolveKnockoutRounds(fixtures).at(-1)?.matchdayKey).toBe('final')
  })
})

describe('eliminacionStrategy', () => {
  it('Debe estar registrada para ELIMINACION y no tener tabla', () => {
    expect(getFormatStrategy('ELIMINACION')).toBe(eliminacionStrategy)
    expect('mapStandingGroup' in eliminacionStrategy).toBe(false)
    expect(eliminacionStrategy.stages).toEqual(['ELIMINACION'])
  })

  it('Debe sincronizar la temporada entera', () => {
    expect(
      eliminacionStrategy.fixturesWindow(new Date('2026-10-23'), 2026),
    ).toEqual({ from: '2026-01-01', to: '2026-12-31' })
  })
})
