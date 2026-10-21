import { envValidationSchema } from './env.validation'

describe('envValidationSchema (proveedor de datos)', () => {
  const validate = (env: Record<string, unknown>) =>
    envValidationSchema.validate(env, { allowUnknown: true, abortEarly: false })

  it('Debe aceptar HIGHLIGHTLY_API_KEY vacía con api-football', () => {
    const { error } = validate({
      FOOTBALL_PROVIDER: 'api-football',
      API_FOOTBALL_KEY: 'k',
      HIGHLIGHTLY_API_KEY: '',
    })

    const messages = error?.details.map((d) => d.message) ?? []
    expect(messages.some((m) => m.includes('HIGHLIGHTLY_API_KEY'))).toBe(false)
  })

  it('Debe exigir API_FOOTBALL_KEY con api-football', () => {
    const { error } = validate({ FOOTBALL_PROVIDER: 'api-football' })

    const messages = error?.details.map((d) => d.message) ?? []
    expect(messages.some((m) => m.includes('API_FOOTBALL_KEY'))).toBe(true)
  })

  it('Debe exigir HIGHLIGHTLY_API_KEY con highlightly y no API_FOOTBALL_KEY', () => {
    const { error } = validate({ FOOTBALL_PROVIDER: 'highlightly' })

    const messages = error?.details.map((d) => d.message) ?? []
    expect(messages.some((m) => m.includes('HIGHLIGHTLY_API_KEY'))).toBe(true)
    expect(messages.some((m) => m.includes('API_FOOTBALL_KEY'))).toBe(false)
  })

  it('Debe usar api-football por defecto', () => {
    const { value } = validate({ API_FOOTBALL_KEY: 'k' })

    expect((value as { FOOTBALL_PROVIDER: string }).FOOTBALL_PROVIDER).toBe(
      'api-football',
    )
  })
})
