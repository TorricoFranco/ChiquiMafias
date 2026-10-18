import { safeEqual } from './safe-equal'

describe('safeEqual', () => {
  it('acepta secretos iguales', () => {
    expect(safeEqual('secreto-largo', 'secreto-largo')).toBe(true)
  })

  it('rechaza secretos distintos, de igual o distinto largo', () => {
    expect(safeEqual('secreto-largo', 'secreto-larga')).toBe(false)
    expect(safeEqual('corto', 'secreto-largo')).toBe(false)
  })

  it('rechaza valores ausentes o que no son texto', () => {
    expect(safeEqual(undefined, 'secreto')).toBe(false)
    expect(safeEqual(['secreto'], 'secreto')).toBe(false)
  })

  it('rechaza si el secreto esperado está vacío o sin definir', () => {
    expect(safeEqual('', '')).toBe(false)
    expect(safeEqual('x', undefined)).toBe(false)
  })
})
