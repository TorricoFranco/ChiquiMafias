import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsInt, IsOptional } from 'class-validator'
import {
  STATS_RANKING_DEFAULT_LIMIT,
  STATS_RANKING_MAX_LIMIT,
} from '../constants/stats-ranking.constant'

const INTEGER_PATTERN = /^-?\d+$/

/**
 * Acota a [min, max] un entero que llega como texto (la query) o como número
 * (si el pipe convierte los tipos): un valor fuera de rango se corrige en vez de
 * rechazarse, para no romper a quien ya lo manda. Lo que no es un entero (texto,
 * decimales, vacío, un parámetro repetido) queda como llegó y lo rechaza
 * `@IsInt`.
 *
 * Es la misma función que lleva `polls/dto/polls-history-query.dto.ts`: hasta
 * que se extraiga a un decorador compartido, cada DTO de query tiene la suya.
 */
const ClampedInt = (min: number, max: number) =>
  Transform(
    ({ value }: { value: unknown }) => {
      if (typeof value === 'string' && INTEGER_PATTERN.test(value)) {
        // Con 309 dígitos o más Number() da ±Infinity, que el clamp lleva igual
        // al extremo: un entero fuera de rango se acota, no se rechaza.
        return Math.min(Math.max(Number(value), min), max)
      }

      return typeof value === 'number' && Number.isInteger(value)
        ? Math.min(Math.max(value, min), max)
        : value
    },
    { toClassOnly: true },
  )

/** Query de los rankings públicos de apuestas de `StatsController`. */
export class StatsRankingQueryDto {
  @ApiPropertyOptional({
    description: `Cantidad de resultados. Menos de 1 se toma como 1 y más de ${STATS_RANKING_MAX_LIMIT} como ${STATS_RANKING_MAX_LIMIT}.`,
    minimum: 1,
    maximum: STATS_RANKING_MAX_LIMIT,
    default: STATS_RANKING_DEFAULT_LIMIT,
  })
  @IsOptional()
  @ClampedInt(1, STATS_RANKING_MAX_LIMIT)
  @IsInt({ message: 'El límite debe ser un número entero' })
  limit: number = STATS_RANKING_DEFAULT_LIMIT
}
