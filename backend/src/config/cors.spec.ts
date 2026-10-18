import { buildCorsOrigins } from './cors'

describe('buildCorsOrigins', () => {
  it('en producción usa solo CLIENT_URL, sin localhost', () => {
    expect(buildCorsOrigins('https://chiquimafias.com', 'production')).toEqual([
      'https://chiquimafias.com',
    ])
  })

  it('fuera de producción suma los localhost de desarrollo', () => {
    expect(
      buildCorsOrigins('https://staging.chiquimafias.com', 'development'),
    ).toEqual([
      'https://staging.chiquimafias.com',
      'http://localhost:3000',
      'http://localhost:3005',
    ])
  })

  it('no duplica orígenes y saca la barra final', () => {
    expect(buildCorsOrigins('http://localhost:3005/', 'development')).toEqual([
      'http://localhost:3005',
      'http://localhost:3000',
    ])
  })

  it('staging se comporta como producción', () => {
    expect(
      buildCorsOrigins('https://staging.chiquimafias.com', 'staging'),
    ).toEqual(['https://staging.chiquimafias.com'])
  })

  it('en producción sin CLIENT_URL no permite ningún origen', () => {
    expect(buildCorsOrigins(undefined, 'production')).toEqual([])
  })
})
