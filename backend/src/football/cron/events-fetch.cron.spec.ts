import { buildEventKey, toWireEvent } from './events-fetch.cron'
import { FootballEvent } from '../football.types'

const goal: FootballEvent = {
  minute: 45,
  extraMinute: 2,
  type: 'Goal',
  detail: 'Normal Goal',
  team: { externalId: 451, name: 'Boca Juniors', logo: 'b.png' },
  player: { externalId: 10, name: 'Cavani' },
  assist: null,
}

describe('EventsFetchCron helpers', () => {
  it('Debe armar el id del evento como antes (api_event_id estable)', () => {
    expect(buildEventKey(goal)).toBe('45-451-10-goal-normal_goal')
  })

  it('Debe usar NONE si el detalle es null o la cadena "null"', () => {
    expect(buildEventKey({ ...goal, detail: null })).toBe('45-451-10-goal-none')
    expect(buildEventKey({ ...goal, detail: 'null' })).toBe(
      '45-451-10-goal-none',
    )
  })

  it('Debe usar 0 como jugador cuando no hay', () => {
    expect(buildEventKey({ ...goal, player: null })).toBe(
      '45-451-0-goal-normal_goal',
    )
  })

  it('Debe publicar el evento con la forma que lee el gateway y el front', () => {
    expect(toWireEvent(goal)).toEqual({
      time: { elapsed: 45, extra: 2 },
      team: { id: 451, name: 'Boca Juniors', logo: 'b.png' },
      player: { id: 10, name: 'Cavani' },
      assist: null,
      type: 'Goal',
      detail: 'Normal Goal',
    })
  })

  it('Debe mandar detail NONE por socket si el evento no tiene detalle', () => {
    expect(toWireEvent({ ...goal, detail: null }).detail).toBe('NONE')
  })
})
