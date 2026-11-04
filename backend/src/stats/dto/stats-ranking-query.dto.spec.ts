import 'reflect-metadata'
import { BadRequestException, ValidationPipe } from '@nestjs/common'
import { StatsRankingQueryDto } from './stats-ranking-query.dto'

// Mismas opciones que el ValidationPipe global (main.ts).
const pipeOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}

const parseWith =
  (validationPipe: ValidationPipe) => (query: Record<string, unknown>) =>
    validationPipe.transform(query, {
      type: 'query',
      metatype: StatsRankingQueryDto,
    }) as Promise<StatsRankingQueryDto>

const parse = parseWith(new ValidationPipe(pipeOptions))

/** Los mensajes con los que el pipe rechaza la query. */
const rejectionOf = async (query: Record<string, unknown>) => {
  const error = await parse(query).then(
    () => null,
    (reason: unknown) => reason as BadRequestException,
  )
  return error ? (error.getResponse() as { message: string[] }).message : null
}

const LIMIT_MESSAGE = 'El límite debe ser un número entero'

describe('StatsRankingQueryDto', () => {
  it('Debe usar 10 resultados si no se manda limit', async () => {
    expect(await parse({})).toMatchObject({ limit: 10 })
  })

  it.each([
    ['1', 1],
    ['5', 5],
    ['10', 10],
    ['25', 25],
    ['50', 50],
  ])(
    'Debe respetar limit=%s, que está dentro del rango',
    async (limit, expected) => {
      expect((await parse({ limit })).limit).toBe(expected)
    },
  )

  it.each([
    ['0', 1],
    ['-1', 1],
    ['-5', 1],
    ['-999', 1],
    ['51', 50],
    ['100000', 50],
    ['99999999999999999999', 50],
  ])(
    'Debe acotar limit=%s a %i en vez de rechazarlo',
    async (limit, expected) => {
      expect((await parse({ limit })).limit).toBe(expected)
    },
  )

  it('Debe acotar también un valor que ya llega como número', async () => {
    expect((await parse({ limit: 100000 })).limit).toBe(50)
    expect((await parse({ limit: 0 })).limit).toBe(1)
    expect((await parse({ limit: -3 })).limit).toBe(1)
    expect((await parse({ limit: 2e21 })).limit).toBe(50)
  })

  it('Debe acotar un entero tan largo que desborda el double (309 dígitos o más)', async () => {
    // Number() de 309 nueves es Infinity: sigue siendo un entero, no un texto inválido.
    expect((await parse({ limit: '9'.repeat(309) })).limit).toBe(50)
    expect((await parse({ limit: `-${'9'.repeat(309)}` })).limit).toBe(1)
    // Con ceros a la izquierda el valor es chico y no desborda.
    expect((await parse({ limit: `${'0'.repeat(400)}7` })).limit).toBe(7)
  })

  it('Debe acotar igual si el pipe convierte los tipos solo (enableImplicitConversion)', async () => {
    // La receta habitual de Nest para queries; con ella el valor llega como número.
    const parseImplicit = parseWith(
      new ValidationPipe({
        ...pipeOptions,
        transformOptions: { enableImplicitConversion: true },
      }),
    )

    expect((await parseImplicit({ limit: '100000' })).limit).toBe(50)
    expect((await parseImplicit({ limit: '-1' })).limit).toBe(1)
    await expect(parseImplicit({ limit: 'abc' })).rejects.toBeInstanceOf(
      BadRequestException,
    )
    await expect(parseImplicit({ limit: '1.5' })).rejects.toBeInstanceOf(
      BadRequestException,
    )
  })

  it.each([
    'abc',
    '1.5',
    '',
    ' 5',
    '+5',
    '1e3',
    '0x10',
    'NaN',
    'Infinity',
    '--5',
  ])('Debe rechazar limit=%j con un mensaje en español', async (limit) => {
    expect(await rejectionOf({ limit })).toEqual([LIMIT_MESSAGE])
  })

  it('Debe rechazar un número que no es entero', async () => {
    expect(await rejectionOf({ limit: 1.5 })).toEqual([LIMIT_MESSAGE])
    expect(await rejectionOf({ limit: NaN })).toEqual([LIMIT_MESSAGE])
    expect(await rejectionOf({ limit: Infinity })).toEqual([LIMIT_MESSAGE])
  })

  it('Debe rechazar un parámetro repetido, como ?limit=5&limit=6', async () => {
    // Con el parser de query de Express 5 llega como array.
    expect(await rejectionOf({ limit: ['5', '6'] })).toEqual([LIMIT_MESSAGE])
  })

  it('Debe rechazar un parámetro que el DTO no declara', async () => {
    expect(await rejectionOf({ foo: '1' })).toEqual([
      'property foo should not exist',
    ])
    expect(await rejectionOf({ limit: '5', page: '2' })).toEqual([
      'property page should not exist',
    ])
  })
})
