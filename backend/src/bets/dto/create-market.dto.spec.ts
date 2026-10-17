import 'reflect-metadata'
import { plainToInstance } from 'class-transformer'
import { validate, ValidationError } from 'class-validator'
import { CreateMarketDto } from './create-market.dto'

// Propiedades con error, con la ruta completa (ej. "options.0.logoUrl").
const failingProps = (errors: ValidationError[], prefix = ''): string[] =>
  errors.flatMap((error) => [
    ...(error.constraints ? [`${prefix}${error.property}`] : []),
    ...failingProps(error.children ?? [], `${prefix}${error.property}.`),
  ])

const validateOption = async (option: Record<string, unknown>) => {
  const dto = plainToInstance(CreateMarketDto, {
    title: 'Quién queda mejor posicionado',
    closesAt: '2026-11-01T20:00:00.000Z',
    options: [
      { name: 'Ronaldo Martinez', initialProb: 50, ...option },
      { name: 'Empate', initialProb: 50 },
    ],
  })
  // Mismas opciones que el ValidationPipe global (main.ts): sin ellas no se rechaza lo que el DTO no declara.
  return failingProps(
    await validate(dto, { whitelist: true, forbidNonWhitelisted: true }),
  )
}

describe('CreateMarketDto (escudo por opción)', () => {
  it('Debe aceptar una opción sin escudo y una con id numérico de club', async () => {
    expect(await validateOption({})).toEqual([])
    expect(await validateOption({ logoUrl: '451' })).toEqual([])
  })

  it('Debe rechazar un escudo que no es un id numérico, como una ruta', async () => {
    expect(await validateOption({ logoUrl: '../x' })).toEqual([
      'options.0.logoUrl',
    ])
  })

  it('Debe rechazar un escudo vacío', async () => {
    expect(await validateOption({ logoUrl: '' })).toEqual(['options.0.logoUrl'])
  })

  it('Debe rechazar un escudo que llega como número', async () => {
    expect(await validateOption({ logoUrl: 451 })).toEqual([
      'options.0.logoUrl',
    ])
  })

  it('Debe rechazar un id de escudo demasiado largo', async () => {
    expect(await validateOption({ logoUrl: '1'.repeat(21) })).toEqual([
      'options.0.logoUrl',
    ])
  })

  it('Debe rechazar un campo de opción que el DTO no declara', async () => {
    expect(await validateOption({ teamId: '451' })).toEqual([
      'options.0.teamId',
    ])
  })
})
