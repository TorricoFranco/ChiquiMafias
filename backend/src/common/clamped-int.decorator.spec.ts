import 'reflect-metadata'
import { instanceToPlain, plainToInstance } from 'class-transformer'
import { IsInt, IsOptional, validate } from 'class-validator'
import { ClampedInt } from './clamped-int.decorator'

class Sample {
  @IsOptional()
  @ClampedInt(1, 50)
  @IsInt()
  value: number = 10
}

const clamp = (value: unknown) => plainToInstance(Sample, { value }).value

describe('ClampedInt', () => {
  it.each([
    ['1', 1],
    ['25', 25],
    ['50', 50],
    ['007', 7],
  ])(
    'Debe dejar %j dentro del rango como %i, bordes incluidos',
    (value, expected) => {
      expect(clamp(value)).toBe(expected)
    },
  )

  it.each([
    ['0', 1],
    ['-0', 1],
    ['-1', 1],
    ['-999', 1],
    ['51', 50],
    ['100000', 50],
    ['99999999999999999999', 50],
    ['-99999999999999999999', 1],
  ])('Debe acotar el texto %j a %i en vez de rechazarlo', (value, expected) => {
    expect(clamp(value)).toBe(expected)
  })

  it('Debe acotar un texto de más de 308 dígitos, aunque Number() lo convierta en Infinity', async () => {
    const huge = '9'.repeat(309)

    expect(Number(huge)).toBe(Infinity)
    expect(clamp(huge)).toBe(50)
    expect(clamp(`-${huge}`)).toBe(1)
    expect(await validate(plainToInstance(Sample, { value: huge }))).toEqual([])
  })

  it.each([
    [1, 1],
    [50, 50],
    [0, 1],
    [-7, 1],
    [51, 50],
    [2e21, 50],
    [-2e21, 1],
  ])('Debe acotar el número %p a %i', (value, expected) => {
    expect(clamp(value)).toBe(expected)
  })

  it.each([
    'abc',
    '1.5',
    '',
    ' 5',
    '5 ',
    '+5',
    '1e3',
    '0x10',
    'NaN',
    'Infinity',
    '--5',
    1.5,
    NaN,
    Infinity,
    true,
    ['1', '2'],
    { a: '1' },
  ])('Debe dejar %p como llegó, para que @IsInt lo rechace', async (value) => {
    const dto = plainToInstance(Sample, { value })

    expect(dto.value).toEqual(value)
    expect(await validate(dto)).toHaveLength(1)
  })

  it('Debe aceptar en @IsInt el valor acotado', async () => {
    expect(
      await validate(plainToInstance(Sample, { value: '100000' })),
    ).toEqual([])
  })

  it('No debe tocar el campo si no viene, así queda el valor por defecto', () => {
    expect(plainToInstance(Sample, {}).value).toBe(10)
  })

  it('No debe acotar al serializar el DTO', () => {
    const dto = Object.assign(new Sample(), { value: 999 })

    expect(instanceToPlain(dto)).toEqual({ value: 999 })
  })
})
