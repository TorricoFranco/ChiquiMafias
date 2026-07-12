import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  ValidateNested,
  ArrayMinSize,
  IsInt,
} from 'class-validator'
import { Type } from 'class-transformer'

export class PollOptionDto {
  @ApiProperty({
    example: 1,
    description: 'ID único de la opción dentro de la encuesta',
  })
  @IsInt()
  id: number

  @ApiProperty({
    example: 'Boca Juniors',
    description: 'Texto visible de la opción',
  })
  @IsString()
  label: string
}

export class CreatePollDto {
  @ApiProperty({
    example: '¿Quién gana el superclásico?',
    description: 'Título principal de la encuesta',
  })
  @IsString()
  title: string

  @ApiPropertyOptional({
    example: 'Votación correspondiente a la fecha 15',
    description: 'Detalle adicional',
  })
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty({
    type: [PollOptionDto],
    description: 'Listado de opciones para votar (Mínimo 2)',
  })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => PollOptionDto)
  options: PollOptionDto[]

  @ApiProperty({
    example: '2026-05-17T12:00:00.000Z',
    description: 'Fecha de apertura',
  })
  @IsDateString()
  startsAt: string

  @ApiProperty({
    example: '2026-05-24T21:00:00.000Z',
    description: 'Fecha de cierre',
  })
  @IsDateString()
  endsAt: string

  @ApiPropertyOptional({
    example: 'FOOTBALL',
    description: 'Icono representativo de la temática',
  })
  @IsOptional()
  @IsString()
  icon?: string
}
