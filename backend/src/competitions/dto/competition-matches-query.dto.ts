import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsDateString,
  IsInt,
  IsOptional,
  Max,
  Min,
  MaxLength,
  Matches,
} from 'class-validator'

export class CompetitionMatchesQueryDto {
  @ApiPropertyOptional({
    example: '2026-10-20',
    description: 'Desde este día (UTC). Va con "to"; máximo 31 días.',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Usá el formato AAAA-MM-DD' })
  @IsDateString({ strict: true }, { message: '"from" no es una fecha válida' })
  from?: string

  @ApiPropertyOptional({
    example: '2026-10-31',
    description: 'Hasta este día inclusive (UTC).',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Usá el formato AAAA-MM-DD' })
  @IsDateString({ strict: true }, { message: '"to" no es una fecha válida' })
  to?: string

  @ApiPropertyOptional({
    example: 'Clausura - 14',
    description: 'Ronda exacta, como la devuelven los partidos.',
  })
  @IsOptional()
  @MaxLength(64, { message: 'La ronda no puede superar 64 caracteres' })
  round?: string

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La página debe ser un número entero' })
  @Min(1, { message: 'La página mínima es 1' })
  @Max(1000, { message: 'La página máxima es 1000' })
  page?: number
}
