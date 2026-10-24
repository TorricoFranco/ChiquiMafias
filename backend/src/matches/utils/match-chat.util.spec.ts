import { getMatchChatState, isMatchChatOpen } from './match-chat.util'

describe('getMatchChatState', () => {
  it.each(['NS', 'TBD', 'PST', null, undefined, 'ALGO_NUEVO'])(
    'Debe dar NOT_STARTED para %s',
    (status) => {
      expect(getMatchChatState(status)).toBe('NOT_STARTED')
    },
  )

  it.each(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE'])(
    'Debe dar OPEN con el partido en juego (%s)',
    (status) => {
      expect(getMatchChatState(status)).toBe('OPEN')
      expect(isMatchChatOpen(status)).toBe(true)
    },
  )

  it.each(['SUSP', 'INT'])(
    'Debe dar PAUSED con el partido suspendido (%s)',
    (status) => {
      expect(getMatchChatState(status)).toBe('PAUSED')
      expect(isMatchChatOpen(status)).toBe(false)
    },
  )

  it.each(['FT', 'AET', 'PEN', 'AWD', 'WO', 'CANC', 'ABD'])(
    'Debe dar CLOSED con el partido terminado (%s)',
    (status) => {
      expect(getMatchChatState(status)).toBe('CLOSED')
      expect(isMatchChatOpen(status)).toBe(false)
    },
  )
})
