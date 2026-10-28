import { MatchEventResponseDto } from '../dto/response/match-events-response.dto'
import {
  hasPenaltyShootout,
  splitPenaltyShootout,
} from './penalty-shootout.util'

const ev = ({
  team,
  name,
  ...over
}: Partial<Omit<MatchEventResponseDto, 'team' | 'player'>> & {
  team: string
  name: string
}): MatchEventResponseDto => ({
  id: `${team}-${name}-${over.minute}-${over.extraMinute}`,
  minute: 120,
  extraMinute: null,
  type: 'Goal',
  detail: 'Penalty',
  team: { id: team, name: team, logo_url: null },
  player: { id: name, name, photo: null },
  assist: null,
  substitutionLog: null,
  ...over,
})

describe('splitPenaltyShootout', () => {
  const goal = ev({
    team: 'H',
    name: 'Goleador',
    minute: 38,
    detail: 'Normal Goal',
  })
  const kicks = [
    ev({ team: 'A', name: 'A1', extraMinute: 1 }),
    ev({ team: 'H', name: 'H1', extraMinute: 1 }),
    ev({ team: 'A', name: 'A2', extraMinute: 2, detail: 'Missed Penalty' }),
    ev({ team: 'H', name: 'H2', extraMinute: 2 }),
  ]

  it('saca los tiros de la tanda de los eventos y los ordena por ronda', () => {
    const { events, shootout } = splitPenaltyShootout([goal, ...kicks], true)

    expect(events).toEqual([goal])
    expect(shootout.map((k) => `${k.teamId}${k.order}:${k.scored}`)).toEqual([
      'A1:true',
      'H1:true',
      'A2:false',
      'H2:true',
    ])
  })

  it('sin marcador de penales deja todo como estaba', () => {
    const all = [goal, ...kicks]
    const { events, shootout } = splitPenaltyShootout(all, false)

    expect(events).toBe(all)
    expect(shootout).toEqual([])
  })

  it('un penal convertido antes del 120 sigue siendo un gol', () => {
    const early = ev({ team: 'H', name: 'P', minute: 90, extraMinute: 2 })
    const { events, shootout } = splitPenaltyShootout([early, ...kicks], true)

    expect(events).toEqual([early])
    expect(shootout).toHaveLength(4)
  })
})

describe('hasPenaltyShootout', () => {
  const match = (
    status_short: string,
    home_penalty_goals: number | null = null,
    away_penalty_goals: number | null = null,
  ) => ({ status_short, home_penalty_goals, away_penalty_goals })

  it('Debe dar tanda en curso aunque el proveedor todavía no mande el marcador', () => {
    expect(hasPenaltyShootout(match('P'))).toBe(true)
  })

  it('Debe dar tanda en un partido terminado por penales', () => {
    expect(hasPenaltyShootout(match('PEN', 4, 3))).toBe(true)
  })

  it('Debe dar tanda si hay marcador de penales aunque el estado sea otro', () => {
    expect(hasPenaltyShootout(match('FT', 4, 3))).toBe(true)
  })

  it('No debe dar tanda en un partido sin penales', () => {
    expect(hasPenaltyShootout(match('2H'))).toBe(false)
    expect(hasPenaltyShootout(match('FT'))).toBe(false)
  })
})
