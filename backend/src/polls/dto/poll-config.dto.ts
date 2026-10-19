import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsIn, IsOptional } from 'class-validator'
import { MATCH_LAYOUTS } from '../constants/poll-types.constant'
import type { MatchLayout } from '../constants/poll-types.constant'

export class PollConfigDto {
  @ApiPropertyOptional({
    enum: MATCH_LAYOUTS,
    example: 'VS',
    description:
      'Formato del tipo MATCH: VS es la tarjeta de partido (equipo 1 · Empate · equipo 2), LIST es una pregunta con un escudo por opción',
  })
  @IsOptional()
  @IsIn(MATCH_LAYOUTS)
  layout?: MatchLayout
}
