import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsInt, IsOptional } from 'class-validator'
import { ClampedInt } from '../../common/clamped-int.decorator'
import {
  POLLS_COMMENTS_DEFAULT_LIMIT,
  POLLS_COMMENTS_MAX_LIMIT,
  POLLS_COMMENTS_MAX_PAGE,
} from '../constants/polls-comments.constant'

export class PollsCommentsQueryDto {
  @ApiPropertyOptional({
    description: `Número de página. Menos de 1 se toma como 1 y más de ${POLLS_COMMENTS_MAX_PAGE} como ${POLLS_COMMENTS_MAX_PAGE}.`,
    minimum: 1,
    maximum: POLLS_COMMENTS_MAX_PAGE,
    default: 1,
  })
  @IsOptional()
  @ClampedInt(1, POLLS_COMMENTS_MAX_PAGE)
  @IsInt({ message: 'La página debe ser un número entero' })
  page: number = 1

  @ApiPropertyOptional({
    description: `Comentarios por página. Menos de 1 se toma como 1 y más de ${POLLS_COMMENTS_MAX_LIMIT} como ${POLLS_COMMENTS_MAX_LIMIT}.`,
    minimum: 1,
    maximum: POLLS_COMMENTS_MAX_LIMIT,
    default: POLLS_COMMENTS_DEFAULT_LIMIT,
  })
  @IsOptional()
  @ClampedInt(1, POLLS_COMMENTS_MAX_LIMIT)
  @IsInt({ message: 'El límite debe ser un número entero' })
  limit: number = POLLS_COMMENTS_DEFAULT_LIMIT
}
