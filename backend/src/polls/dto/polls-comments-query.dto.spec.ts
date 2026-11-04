import 'reflect-metadata'
import { BadRequestException, ValidationPipe } from '@nestjs/common'
import { PollsCommentsQueryDto } from './polls-comments-query.dto'

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
      metatype: PollsCommentsQueryDto,
    }) as Promise<PollsCommentsQueryDto>

const parse = parseWith(new ValidationPipe(pipeOptions))

/** Los mensajes con los que el pipe rechaza la query. */
const rejectionOf = async (query: Record<string, unknown>) => {
  const error = await parse(query).then(
    () => null,
    (reason: unknown) => reason as BadRequestException,
  )
  return error ? (error.getResponse() as { message: string[] }).message : null
}

const PAGE_MESSAGE = 'La página debe ser un número entero'
const LIMIT_MESSAGE = 'El límite debe ser un número entero'

describe('PollsCommentsQueryDto', () => {
  it('Debe usar la página 1 y 20 comentarios si no se mandan', async () => {
    expect(await parse({})).toMatchObject({ page: 1, limit: 20 })
  })

  it('Debe completar con el valor por defecto el parámetro que falta', async () => {
    expect(await parse({ page: '4' })).toMatchObject({ page: 4, limit: 20 })
    expect(await parse({ limit: '30' })).toMatchObject({ page: 1, limit: 30 })
  })

  it('Debe respetar lo que pide el front (page=1&limit=20)', async () => {
    expect(await parse({ page: '1', limit: '20' })).toMatchObject({
      page: 1,
      limit: 20,
    })
  })

  it('Debe respetar los valores dentro del rango, bordes incluidos', async () => {
    expect(await parse({ page: '3', limit: '25' })).toMatchObject({
      page: 3,
      limit: 25,
    })
    expect(await parse({ page: '1', limit: '1' })).toMatchObject({
      page: 1,
      limit: 1,
    })
    expect(await parse({ page: '1000000', limit: '50' })).toMatchObject({
      page: 1_000_000,
      limit: 50,
    })
  })

  it.each([
    ['0', 1],
    ['-1', 1],
    ['-999', 1],
    ['1000001', 1_000_000],
    ['99999999999999999999', 1_000_000],
  ])(
    'Debe acotar page=%s a %i en vez de rechazarlo',
    async (page, expected) => {
      expect((await parse({ page })).page).toBe(expected)
    },
  )

  it.each([
    ['0', 1],
    ['-5', 1],
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
    expect(await parse({ page: -1, limit: 100000 })).toMatchObject({
      page: 1,
      limit: 50,
    })
    expect(await parse({ page: 2e21, limit: 0 })).toMatchObject({
      page: 1_000_000,
      limit: 1,
    })
  })

  it('Debe acotar un page o un limit de más de 308 dígitos en vez de rechazarlo', async () => {
    // Number() los convierte en Infinity.
    const huge = '9'.repeat(309)

    expect(await parse({ page: huge, limit: huge })).toMatchObject({
      page: 1_000_000,
      limit: 50,
    })
  })

  it('Debe acotar igual si el pipe convierte los tipos solo (enableImplicitConversion)', async () => {
    // La receta habitual de Nest para queries; con ella el valor llega como número.
    const parseImplicit = parseWith(
      new ValidationPipe({
        ...pipeOptions,
        transformOptions: { enableImplicitConversion: true },
      }),
    )

    expect(await parseImplicit({ page: '-1', limit: '100000' })).toMatchObject({
      page: 1,
      limit: 50,
    })
    await expect(parseImplicit({ limit: 'abc' })).rejects.toBeInstanceOf(
      BadRequestException,
    )
    await expect(parseImplicit({ limit: '1.5' })).rejects.toBeInstanceOf(
      BadRequestException,
    )
  })

  it.each(['abc', '1.5', '', ' 5', '1e3', '0x10', 'NaN', 'Infinity', '--5'])(
    'Debe rechazar page=%j con un mensaje en español',
    async (page) => {
      expect(await rejectionOf({ page })).toEqual([PAGE_MESSAGE])
    },
  )

  it.each(['abc', '1.5', '', ' 5', '1e3', '0x10', 'NaN', 'Infinity', '--5'])(
    'Debe rechazar limit=%j con un mensaje en español',
    async (limit) => {
      expect(await rejectionOf({ limit })).toEqual([LIMIT_MESSAGE])
    },
  )

  it('Debe rechazar un número que no es entero', async () => {
    expect(await rejectionOf({ page: 1.5 })).toEqual([PAGE_MESSAGE])
    expect(await rejectionOf({ limit: NaN })).toEqual([LIMIT_MESSAGE])
  })

  it('Debe rechazar un parámetro repetido, como ?page=1&page=2', async () => {
    // Con el parser de query de Express 5 llega como array.
    expect(await rejectionOf({ page: ['1', '2'] })).toEqual([PAGE_MESSAGE])
    expect(await rejectionOf({ limit: ['5', '6'] })).toEqual([LIMIT_MESSAGE])
  })

  it('Debe informar los dos mensajes si page y limit están mal', async () => {
    const messages = await rejectionOf({ page: 'x', limit: 'y' })

    expect(messages).toHaveLength(2)
    expect(messages).toEqual(
      expect.arrayContaining([PAGE_MESSAGE, LIMIT_MESSAGE]),
    )
  })

  it('Debe rechazar un parámetro que el DTO no declara', async () => {
    expect(await rejectionOf({ foo: '1' })).toEqual([
      'property foo should not exist',
    ])
  })
})
