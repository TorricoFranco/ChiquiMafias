import {
  computeSlots,
  KnockoutMatch,
  layoutFromMatches,
  matchWinner,
} from './bracket-builder'

let seq = 0
const match = (
  roundOrder: number,
  home: string,
  away: string,
  over: Partial<KnockoutMatch> = {},
): KnockoutMatch => {
  seq += 1
  return {
    id: `m${roundOrder}-${home}-${away}`,
    roundOrder,
    date: new Date(Date.UTC(2026, roundOrder, 1, 0, seq)),
    homeTeamId: home,
    awayTeamId: away,
    statusShort: 'FT',
    homeGoals: 1,
    awayGoals: 0,
    homePenalties: null,
    awayPenalties: null,
    ...over,
  }
}

describe('matchWinner', () => {
  it('Debe ganar el de más goles', () => {
    expect(
      matchWinner(match(1, 'a', 'b', { homeGoals: 0, awayGoals: 2 })),
    ).toBe('b')
  })

  it('Con empate debe ganar el de más penales (RF-B06)', () => {
    const m = match(1, 'a', 'b', {
      statusShort: 'PEN',
      homeGoals: 1,
      awayGoals: 1,
      homePenalties: 3,
      awayPenalties: 4,
    })
    expect(matchWinner(m)).toBe('b')
  })

  it('Un partido sin terminar no tiene ganador', () => {
    expect(matchWinner(match(1, 'a', 'b', { statusShort: '2H' }))).toBeNull()
    expect(matchWinner(match(1, 'a', 'b', { statusShort: 'NS' }))).toBeNull()
  })

  it('En escritorio gana el del marcador; sin marcador queda para corregir', () => {
    expect(
      matchWinner(
        match(1, 'a', 'b', { statusShort: 'AWD', homeGoals: 3, awayGoals: 0 }),
      ),
    ).toBe('a')
    expect(
      matchWinner(
        match(1, 'a', 'b', {
          statusShort: 'WO',
          homeGoals: null,
          awayGoals: null,
        }),
      ),
    ).toBeNull()
  })
})

describe('layoutFromMatches y computeSlots (cuadro de 8, 3 rondas)', () => {
  // Cuartos: a-b, c-d, e-f, g-h. Semis: a-c (ganó a), e-g (ganó g). Final: a-g.
  const quarters = [
    match(1, 'e', 'f'),
    match(1, 'a', 'b'),
    match(1, 'g', 'h', {
      homeGoals: 2,
      awayGoals: 2,
      statusShort: 'PEN',
      homePenalties: 5,
      awayPenalties: 4,
    }),
    match(1, 'c', 'd'),
  ]
  const semis = [
    match(2, 'e', 'g', { homeGoals: 0, awayGoals: 1 }),
    match(2, 'a', 'c'),
  ]
  const final = match(3, 'g', 'a', {
    statusShort: 'NS',
    homeGoals: null,
    awayGoals: null,
  })

  it('Debe ubicar cada partido debajo de la llave a la que llevó su ganador', () => {
    const { positions, unplaced } = layoutFromMatches(
      [...quarters, ...semis, final],
      3,
    )

    expect(unplaced).toEqual([])
    expect(positions[3].map((m) => m?.id)).toEqual(['m3-g-a'])
    // El local de la final (g) sale de la semi de arriba.
    expect(positions[2].map((m) => m?.id)).toEqual(['m2-e-g', 'm2-a-c'])
    expect(positions[1].map((m) => m?.id)).toEqual([
      'm1-e-f',
      'm1-g-h',
      'm1-a-b',
      'm1-c-d',
    ])
  })

  it('Sin final, la ronda más alta se ordena por fecha y el cuadro deja la final por definir', () => {
    const { positions } = layoutFromMatches([...quarters, ...semis], 3)
    const slots = computeSlots(positions, 3)

    expect(slots).toHaveLength(7)
    expect(slots.at(-1)).toEqual({
      roundOrder: 3,
      position: 1,
      matchId: null,
      homeTeamId: 'g',
      awayTeamId: 'a',
      winnerTeamId: null,
    })
  })

  it('Con solo la primera ronda jugada, los ganadores avanzan a llaves sin partido', () => {
    const { positions } = layoutFromMatches(quarters, 3)
    const slots = computeSlots(positions, 3)

    // Sin rondas posteriores, los cuartos van por fecha: e-f, a-b, g-h, c-d.
    const semisSlots = slots.filter((s) => s.roundOrder === 2)
    expect(semisSlots).toEqual([
      expect.objectContaining({
        matchId: null,
        homeTeamId: 'e',
        awayTeamId: 'a',
      }),
      expect.objectContaining({
        matchId: null,
        homeTeamId: 'g',
        awayTeamId: 'c',
      }),
    ])
  })

  it('Un partido sin terminar no hace avanzar a nadie', () => {
    const pending = [
      match(1, 'a', 'b', {
        statusShort: 'NS',
        homeGoals: null,
        awayGoals: null,
      }),
    ]
    const slots = computeSlots(layoutFromMatches(pending, 3).positions, 3)

    expect(slots.find((s) => s.roundOrder === 2 && s.position === 1)).toEqual(
      expect.objectContaining({ homeTeamId: null, awayTeamId: null }),
    )
  })

  it('Un partido cuya ronda siguiente no se jugó va a un lugar libre de una llave sin partido', () => {
    // La semi de arriba ya se jugó; la de abajo todavía no: e-f y g-h quedan libres.
    const { positions, unplaced } = layoutFromMatches(
      [...quarters, match(2, 'a', 'c')],
      3,
    )

    expect(unplaced).toEqual([])
    expect(positions[1].map((m) => m?.id)).toEqual([
      'm1-a-b',
      'm1-c-d',
      'm1-e-f',
      'm1-g-h',
    ])
  })

  it('Si sobran partidos para los lugares, los devuelve aparte', () => {
    const extra = match(2, 'x', 'y')
    const { unplaced } = layoutFromMatches([...semis, extra], 3)

    expect(unplaced.map((m) => m.id)).toEqual(['m2-x-y'])
  })

  it('Debe ignorar partidos con una ronda fuera del cuadro', () => {
    const { positions, unplaced } = layoutFromMatches([match(9, 'a', 'b')], 3)

    expect(unplaced).toEqual([])
    expect(positions.flat().filter(Boolean)).toEqual([])
  })
})
