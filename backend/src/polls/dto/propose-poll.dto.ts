import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ArrayMaxSize,
  IsEnum,
  ValidateNested,
  MaxLength,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { PollType } from '@prisma/client'
import { PollConfigDto } from './poll-config.dto'

export class ProposePollDto {
  @ApiProperty({ example: '¿Quién gana el superclásico?' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string

  @ApiProperty({ example: 'Voten a conciencia', required: false })
  @IsString()
  @IsOptional()
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
    example: ['Boca', 'River'],
    description:
      'Etiquetas de las opciones. Los tipos de opciones fijas (FACTO, RATING) y los informativos no las llevan',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(6)
  options?: string[]

  @ApiPropertyOptional({
    example: ['435', '451'],
    description:
      'Escudos alineados por índice con options (api_team_id). Cadena vacía para una opción sin escudo',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(6)
  optionTeamIds?: string[]

  @ApiPropertyOptional({ type: PollConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PollConfigDto)
  config?: PollConfigDto

  @ApiProperty({ example: 'FOOTBALL', required: false })
  @IsString()
  @IsOptional()
  icon?: string
}
