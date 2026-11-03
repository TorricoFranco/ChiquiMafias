import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsInt, IsOptional } from 'class-validator'
import {
  POLLS_HISTORY_DEFAULT_LIMIT,
  POLLS_HISTORY_MAX_LIMIT,
  POLLS_HISTORY_MAX_PAGE,
} from '../constants/polls-history.constant'

const INTEGER_PATTERN = /^-?\d+$/

/**
 * Acota a [min, max] un entero que llega como texto (la query) o como número
 * (si el pipe convierte los tipos): un valor fuera de rango se corrige en vez de
 * rechazarse, para no romper a quien ya lo manda. Lo que no es un entero (texto,
 * decimales, vacío, un parámetro repetido) queda como llegó y lo rechaza
 * `@IsInt`.
 */
const ClampedInt = (min: number, max: number) =>
  Transform(
    ({ value }: { value: unknown }) => {
      const parsed =
        typeof value === 'string' && INTEGER_PATTERN.test(value)
          ? Number(value)
          : value

      return typeof parsed === 'number' && Number.isInteger(parsed)
        ? Math.min(Math.max(parsed, min), max)
        : value
    },
    { toClassOnly: true },
  )

export class PollsHistoryQueryDto {
  @ApiPropertyOptional({
    description: `Número de página. Menos de 1 se toma como 1 y más de ${POLLS_HISTORY_MAX_PAGE} como ${POLLS_HISTORY_MAX_PAGE}.`,
    minimum: 1,
    maximum: POLLS_HISTORY_MAX_PAGE,
    default: 1,
  })
  @IsOptional()
  @ClampedInt(1, POLLS_HISTORY_MAX_PAGE)
  @IsInt({ message: 'La página debe ser un número entero' })
  page: number = 1

  @ApiPropertyOptional({
    description: `Resultados por página. Menos de 1 se toma como 1 y más de ${POLLS_HISTORY_MAX_LIMIT} como ${POLLS_HISTORY_MAX_LIMIT}.`,
    minimum: 1,
    maximum: POLLS_HISTORY_MAX_LIMIT,
    default: POLLS_HISTORY_DEFAULT_LIMIT,
  })
  @IsOptional()
  @ClampedInt(1, POLLS_HISTORY_MAX_LIMIT)
  @IsInt({ message: 'El límite debe ser un número entero' })
  limit: number = POLLS_HISTORY_DEFAULT_LIMIT
}
