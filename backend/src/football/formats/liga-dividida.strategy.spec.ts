import { FootballFixture } from '../football.types'
import { getFormatStrategy } from './format-registry'
import {
  ligaDivididaStrategy,
  mapLigaDivididaGroup,
  resolveLigaDivididaRound,
} from './liga-dividida.strategy'

const fixtureWithRound = (round: string) =>
  ({ league: { externalId: 128, season: 2026, round } }) as FootballFixture

describe('resolveLigaDivididaRound', () => {
  it('Debe resolver una fecha numerada del Apertura', () => {
    expect(resolveLigaDivididaRound('Apertura - 9', 'N/A')).toEqual({
      round: 'Regular Season - 9',
      tournament: 'APERTURA',
      matchdayKey: 'fecha:9',
    })
  })

  it('Debe resolver una fecha del Clausura', () => {
    expect(resolveLigaDivididaRound('Clausura - 12', 'N/A')).toEqual({
      round: 'Clausura - 12',
      tournament: 'CLAUSURA',
      matchdayKey: 'fecha:12',
    })
  })

  it('Debe resolver una fase de playoff como clave de texto', () => {
    expect(
      resolveLigaDivididaRound('Clausura - Quarter-finals', 'N/A'),
    ).toEqual({
      round: 'Clausura - cuartos',
      tournament: 'CLAUSURA',
      matchdayKey: 'cuartos',
    })
  })

  it('Debe resolver los octavos del Clausura con la etiqueta de Highlightly', () => {
    expect(resolveLigaDivididaRound('Clausura - Round of 16', 'N/A')).toEqual({
      round: 'Clausura - octavos',
      tournament: 'CLAUSURA',
      matchdayKey: 'octavos',
    })
  })

  it.each([
    ['Clausura - 8th Finals', 'Clausura - octavos'],
    ['Clausura - 1/4 Finals', 'Clausura - cuartos'],
    ['Clausura - Semi-final', 'Clausura - semifinal'],
    ['Clausura - Grand Final', 'Clausura - final'],
    ['Apertura - Quarterfinals', 'Regular Season - cuartos'],
  ])(
    'Debe reconocer el playoff "%s" aunque no esté en ROUND_MAP',
    (raw, round) => {
      expect(resolveLigaDivididaRound(raw, 'N/A').round).toBe(round)
    },
  )

  it('Debe dejar igual una fecha numerada que no está en ROUND_MAP', () => {
    expect(resolveLigaDivididaRound('Regular Season - 3', 'N/A')).toEqual({
      round: 'Regular Season - 3',
      tournament: 'APERTURA',
      matchdayKey: 'fecha:3',
    })
  })

  it('Debe dejar igual una ronda desconocida', () => {
    expect(resolveLigaDivididaRound('Clausura - Repechaje', 'N/A')).toEqual({
      round: 'Clausura - Repechaje',
      tournament: 'CLAUSURA',
      matchdayKey: 'repechaje',
    })
  })

  it('Debe usar el fallback si no hay ronda', () => {
    expect(resolveLigaDivididaRound(undefined, 'N/A').round).toBe('N/A')
    expect(resolveLigaDivididaRound(null, 'Unknown Round').round).toBe(
      'Unknown Round',
    )
  })
})

describe('mapLigaDivididaGroup', () => {
  it.each([
    ['Clausura, Group A', { stage: 'CLAUSURA', groupName: 'A' }],
    ['Clausura, Group B', { stage: 'CLAUSURA', groupName: 'B' }],
    ['Apertura - Group A', { stage: 'APERTURA', groupName: 'A' }],
    ['Tabla Anual', { stage: 'ANNUAL', groupName: null }],
    ['Promedios', { stage: 'AVERAGES', groupName: null }],
  ])('Debe mapear "%s"', (raw, expected) => {
    expect(mapLigaDivididaGroup(raw)).toEqual(expected)
  })
})

describe('ligaDivididaStrategy', () => {
  it('Debe estar registrada para LIGA_DIVIDIDA', () => {
    expect(getFormatStrategy('LIGA_DIVIDIDA')).toBe(ligaDivididaStrategy)
  })

  it('Los formatos sin implementar no deben tener estrategia', () => {
    expect(getFormatStrategy('GRUPOS_Y_ELIMINACION')).toBeNull()
  })

  it('Debe pedir del día de hace 10 días al de dentro de 7', () => {
    const now = new Date('2026-10-22T15:00:00.000Z')

    expect(ligaDivididaStrategy.fixturesWindow(now)).toEqual({
      from: '2026-10-12',
      to: '2026-10-29',
    })
  })

  it('Debe resolver las rondas en el mismo orden que los partidos', () => {
    const rounds = ligaDivididaStrategy.resolveRounds([
      fixtureWithRound('Clausura - 14'),
      fixtureWithRound('Apertura - Final'),
    ])

    expect(rounds).toEqual([
      {
        round: 'Clausura - 14',
        tournament: 'CLAUSURA',
        matchdayKey: 'fecha:14',
      },
      {
        round: 'Regular Season - final',
        tournament: 'APERTURA',
        matchdayKey: 'final',
      },
    ])
  })
})
