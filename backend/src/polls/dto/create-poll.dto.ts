import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  ValidateNested,
  ArrayMaxSize,
  IsInt,
  IsEnum,
  MaxLength,
} from 'class-validator'
import { Type } from 'class-transformer'
import { PollType } from '@prisma/client'
import { PollConfigDto } from './poll-config.dto'

export class PollOptionDto {
  @ApiPropertyOptional({
    example: 1,
    description:
      'Ignorado: el backend numera las opciones de forma correlativa desde 1',
  })
  @IsOptional()
  @IsInt()
  id?: number

  @ApiProperty({
    example: 'Boca Juniors',
    description: 'Texto visible de la opción',
  })
  @IsString()
  label: string

  @ApiPropertyOptional({
    example: '435',
    description: 'Escudo de la opción (api_team_id)',
  })
  @IsOptional()
  @IsString()
  teamId?: string
}

export class CreatePollDto {
  @ApiProperty({
    example: '¿Quién gana el superclásico?',
    description: 'Título principal de la encuesta',
  })
  @IsString()
  @MaxLength(100)
  title: string

  @ApiPropertyOptional({
    example: 'Votación correspondiente a la fecha 15',
    description: 'Detalle adicional',
  })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  description?: string

  @ApiPropertyOptional({
    enum: PollType,
    default: PollType.CLASSIC,
    description: 'Tipo de encuesta. Si no se manda, es CLASSIC',
  })
  @IsOptional()
  @IsEnum(PollType)
  type?: PollType

  @ApiPropertyOptional({
    type: [PollOptionDto],
    description:
      'Opciones para votar. Los tipos de opciones fijas (FACTO, RATING) y los informativos no las llevan',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => PollOptionDto)
  options?: PollOptionDto[]

  @ApiPropertyOptional({ type: PollConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PollConfigDto)
  config?: PollConfigDto

  @ApiPropertyOptional({
    example: '2026-05-17T12:00:00.000Z',
    description: 'Fecha de apertura. Si no se manda, abre al crearse',
  })
  @IsOptional()
  @IsDateString()
  startsAt?: string

  @ApiPropertyOptional({
    example: '2026-05-24T21:00:00.000Z',
    description:
      'Fecha de cierre. Obligatoria salvo en los tipos informativos, que no cierran',
  })
  @IsOptional()
  @IsDateString()
  endsAt?: string

  @ApiPropertyOptional({
    default: true,
    description: 'Si la encuesta acepta comentarios',
  })
  @IsOptional()
  @IsBoolean()
  commentsEnabled?: boolean

  @ApiPropertyOptional({
    example: 'FOOTBALL',
    description: 'Icono representativo de la temática',
  })
  @IsOptional()
  @IsString()
  icon?: string
}
