import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsInt, IsOptional } from 'class-validator'
import { ClampedInt } from '../../common/clamped-int.decorator'
import {
  POLLS_HISTORY_DEFAULT_LIMIT,
  POLLS_HISTORY_MAX_LIMIT,
  POLLS_HISTORY_MAX_PAGE,
} from '../constants/polls-history.constant'

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
