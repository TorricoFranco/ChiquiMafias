import { Transform } from 'class-transformer'

const INTEGER_PATTERN = /^-?\d+$/

/**
 * Acota a [min, max] un entero que llega como texto (la query) o como número
 * (si el pipe convierte los tipos): un valor fuera de rango se corrige en vez de
 * rechazarse, para no romper a quien ya lo manda. Lo que no es un entero (texto,
 * decimales, vacío, un parámetro repetido) queda como llegó y lo rechaza
 * `@IsInt`, así que siempre va junto a él (y a `@IsOptional` si el parámetro
 * puede faltar). Solo actúa al armar el DTO, no al serializarlo.
 *
 * Es para parámetros de query: `@IsOptional` también deja pasar un `null`, que
 * una query no puede traer pero el body JSON de otra ruta sí.
 */
export const ClampedInt = (min: number, max: number) => {
  const clamp = (value: number) => Math.min(Math.max(value, min), max)

  return Transform(
    ({ value }: { value: unknown }) => {
      // Un texto de más de 308 dígitos da ±Infinity al convertirlo: sigue siendo
      // un entero fuera de rango, así que también se acota.
      if (typeof value === 'string' && INTEGER_PATTERN.test(value)) {
        return clamp(Number(value))
      }

      return typeof value === 'number' && Number.isInteger(value)
        ? clamp(value)
        : value
    },
    { toClassOnly: true },
  )
}
