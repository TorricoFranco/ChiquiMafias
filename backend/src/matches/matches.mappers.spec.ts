import { MatchesMappers } from './matches.mappers'
import { FootballFixture } from 'src/football/football.types'

const fixture = (
  id: number,
  homeId: number,
  awayId: number,
  winner: 'home' | 'away' | null,
  short = 'FT',
): FootballFixture => ({
  externalId: id,
  date: '2026-01-01T20:00:00+00:00',
  timestamp: 1,
  timezone: 'UTC',
  referee: null,
  venue: { externalId: 1, name: 'Estadio', city: 'Ciudad' },
  status: { short, long: short, elapsed: 90 },
  league: { externalId: 128, season: 2025, round: 'Apertura - 1' },
  home: {
    externalId: homeId,
    name: `T${homeId}`,
    logo: `${homeId}.png`,
    winner: winner === 'home' ? true : winner === 'away' ? false : null,
  },
  away: {
    externalId: awayId,
    name: `T${awayId}`,
    logo: `${awayId}.png`,
    winner: winner === 'away' ? true : winner === 'home' ? false : null,
  },
  goals: { home: 2, away: 1 },
  penalty: { home: null, away: null },
})

describe('MatchesMappers.formatH2H', () => {
  it('Debe contar victorias del local actual aunque haya jugado de visitante', () => {
    const result = MatchesMappers.formatH2H(
      [
        fixture(1, 451, 435, 'home'),
        fixture(2, 435, 451, 'home'),
        fixture(3, 451, 435, null),
      ],
      '451',
    )

    expect(result).toMatchObject({
      homeWins: 1,
      awayWins: 1,
      draws: 1,
      total: 3,
    })
  })

  it('Debe ignorar los partidos que no terminaron', () => {
    const result = MatchesMappers.formatH2H(
      [fixture(1, 451, 435, 'home'), fixture(2, 451, 435, null, 'NS')],
      '451',
    )

    expect(result).toMatchObject({ total: 1, homeWins: 1 })
  })

  it('Debe dar la misma forma de partido que consume el front', () => {
    const result = MatchesMappers.formatH2H(
      [fixture(1, 451, 435, 'home')],
      '451',
    )

    expect(result.lastMatches[0]).toEqual({
      fixture: {
        id: 1,
        date: '2026-01-01T20:00:00+00:00',
        venue: { name: 'Estadio', city: 'Ciudad' },
        status: { short: 'FT' },
      },
      teams: {
        home: { id: 451, name: 'T451', logo: '451.png' },
        away: { id: 435, name: 'T435', logo: '435.png' },
      },
      goals: { home: 2, away: 1 },
    })
  })

  it('Debe devolver ceros si no es una lista', () => {
    expect(
      MatchesMappers.formatH2H(undefined as unknown as FootballFixture[], '1'),
    ).toEqual({ homeWins: 0, awayWins: 0, draws: 0, total: 0, lastMatches: [] })
  })
})
