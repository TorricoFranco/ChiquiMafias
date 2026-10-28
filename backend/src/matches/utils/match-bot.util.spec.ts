import {
  BotWireEvent,
  botReactionTo,
  shootoutMissMessage,
} from './match-bot.util'

const ev = (
  elapsed: number,
  detail: string,
  extra: number | null = null,
): BotWireEvent => ({
  time: { elapsed, extra },
  team: { id: 1, name: 'Boca' },
  player: { id: 9, name: 'Cavani' },
  type: 'Goal',
  detail,
})

describe('botReactionTo', () => {
  it('Debe anunciar los goles del partido, también los de penal', () => {
    expect(botReactionTo(ev(30, 'Normal Goal'))).toBe('GOAL')
    expect(botReactionTo(ev(55, 'Own Goal'))).toBe('GOAL')
    expect(botReactionTo(ev(90, 'Penalty', 4))).toBe('GOAL')
  })

  it('No debe decir nada de un penal errado en el tiempo regular', () => {
    expect(botReactionTo(ev(90, 'Missed Penalty', 2))).toBeNull()
  })

  it('No debe anunciar como gol un tiro convertido de la tanda', () => {
    expect(botReactionTo(ev(120, 'Penalty', 3))).toBeNull()
  })

  it('Debe cargar al que erra en la tanda', () => {
    expect(botReactionTo(ev(120, 'Missed Penalty', 3))).toBe('SHOOTOUT_MISS')
  })

  it('No debe reaccionar a otros eventos', () => {
    expect(botReactionTo({ ...ev(20, 'Yellow Card'), type: 'Card' })).toBeNull()
  })

  it('No debe romperse con un evento sin minuto', () => {
    expect(
      botReactionTo({ ...ev(0, 'Normal Goal'), time: undefined as never }),
    ).toBe('GOAL')
  })
})

describe('shootoutMissMessage', () => {
  it('Debe elegir uno de los mensajes al azar con el nombre del pateador', () => {
    expect(shootoutMissMessage('Zenón', () => 0)).toBe(
      '¿Para qué te traje, Zenón? 🤦',
    )
    expect(shootoutMissMessage('Zenón', () => 0.99)).toBe(
      'Erró Zenón... viven en un country 🏡',
    )
  })

  it('Debe tener los cuatro mensajes', () => {
    const messages = new Set(
      [0, 0.25, 0.5, 0.75].map((r) => shootoutMissMessage('X', () => r)),
    )
    expect(messages.size).toBe(4)
  })
})
