import { resolveMatchOutcome } from './match-outcome.util'

describe('resolveMatchOutcome', () => {
  it('Debe dar el resultado por goles en un partido terminado (FT)', () => {
    expect(resolveMatchOutcome('FT', 2, 1)).toBe('HOME')
    expect(resolveMatchOutcome('FT', 1, 1)).toBe('DRAW')
    expect(resolveMatchOutcome('FT', 0, 2)).toBe('AWAY')
  })

  it('Debe dar empate en un partido que se definió en el alargue (AET): a los 90 estaba igualado', () => {
    expect(resolveMatchOutcome('AET', 3, 2)).toBe('DRAW')
    expect(resolveMatchOutcome('AET', 0, 1)).toBe('DRAW')
  })

  it('Debe dar empate en un partido definido por penales (PEN), sin importar la tanda', () => {
    expect(resolveMatchOutcome('PEN', 1, 1)).toBe('DRAW')
    expect(resolveMatchOutcome('PEN', null, null)).toBe('DRAW')
  })

  it.each(['PST', 'CANC', 'ABD', 'AWD', 'WO'])(
    'Debe anular el mercado si el partido quedó en %s',
    (status) => {
      expect(resolveMatchOutcome(status, null, null)).toBe('VOID')
      expect(resolveMatchOutcome(status, 3, 0)).toBe('VOID')
    },
  )

  it.each([
    'NS',
    'TBD',
    '1H',
    'HT',
    '2H',
    'ET',
    'BT',
    'P',
    'LIVE',
    'SUSP',
    'INT',
  ])('No debe liquidar todavía un partido en %s', (status) => {
    expect(resolveMatchOutcome(status, 1, 0)).toBeNull()
  })

  it('No debe liquidar un partido terminado sin goles cargados', () => {
    expect(resolveMatchOutcome('FT', null, 1)).toBeNull()
    expect(resolveMatchOutcome('FT', 1, null)).toBeNull()
  })
})
