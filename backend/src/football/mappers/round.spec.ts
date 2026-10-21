import { fixturesCacheKey, resolveRound } from './round'

describe('resolveRound', () => {
  it('Debe resolver una fecha numerada del Apertura', () => {
    expect(resolveRound('Apertura - 9', 'N/A')).toEqual({
      round: 'Regular Season - 9',
      tournament: 'APERTURA',
      matchdayKey: 'fecha:9',
    })
  })

  it('Debe resolver una fecha del Clausura', () => {
    expect(resolveRound('Clausura - 12', 'N/A')).toEqual({
      round: 'Clausura - 12',
      tournament: 'CLAUSURA',
      matchdayKey: 'fecha:12',
    })
  })

  it('Debe resolver una fase de playoff como clave de texto', () => {
    expect(resolveRound('Clausura - Quarter-finals', 'N/A')).toEqual({
      round: 'Clausura - cuartos',
      tournament: 'CLAUSURA',
      matchdayKey: 'cuartos',
    })
  })

  it('Debe usar el fallback si no hay ronda', () => {
    expect(resolveRound(undefined, 'N/A').round).toBe('N/A')
    expect(resolveRound(null, 'Unknown Round').round).toBe('Unknown Round')
  })

  it('Debe armar la clave de caché de la fecha', () => {
    expect(fixturesCacheKey(128, 2026, 'APERTURA', 'fecha:9')).toBe(
      'fixtures:128:2026:APERTURA:fecha:9',
    )
  })
})
