import { throttleLimit } from './throttle'

describe('throttleLimit', () => {
  it('sin override usa 150 peticiones por minuto', () => {
    expect(throttleLimit('development', undefined)).toBe(150)
  })

  it('fuera de producción respeta THROTTLE_LIMIT para pruebas de carga', () => {
    expect(throttleLimit('development', 100000)).toBe(100000)
  })

  it('en producción ignora THROTTLE_LIMIT y usa 150', () => {
    expect(throttleLimit('production', 100000)).toBe(150)
  })

  it('en staging también ignora THROTTLE_LIMIT y usa 150', () => {
    expect(throttleLimit('staging', 100000)).toBe(150)
  })
})
