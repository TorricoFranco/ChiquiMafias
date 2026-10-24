import { fixturesCacheKey, leagueCacheKey, matchdayKeyOf } from './round'

describe('round', () => {
  it.each([
    ['Regular Season - 9', 'fecha:9'],
    ['Regular Sesaon - 10', 'fecha:10'],
    ['Clausura - cuartos', 'cuartos'],
    ['Clausura - Round of 16', 'round_of_16'],
  ])('Debe derivar la clave de la fecha de "%s"', (round, expected) => {
    expect(matchdayKeyOf(round)).toBe(expected)
  })

  it('Debe armar la clave de caché de la fecha', () => {
    expect(fixturesCacheKey(128, 2026, 'APERTURA', 'fecha:9')).toBe(
      'fixtures:128:2026:APERTURA:fecha:9',
    )
  })

  it('Debe usar el ID de API-Football como clave de la Liga y el uuid en las demás', () => {
    expect(leagueCacheKey({ id: 'uuid-liga', api_league_id: 128 })).toBe(128)
    expect(leagueCacheKey({ id: 'uuid-copa', api_league_id: null })).toBe(
      'uuid-copa',
    )
  })
})
