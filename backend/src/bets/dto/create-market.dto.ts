import {
  IsNotEmpty,
  IsString,
  IsDateString,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  Max,
  IsEnum,
  IsOptional,
  IsObject,
} from 'class-validator'
import { Type } from 'class-transformer'
import { MarketType } from '@prisma/client'
import { ApiProperty } from '@nestjs/swagger'

class TeamMetadataDto {
  @ApiProperty({ description: 'Nombre completo del equipo' })
  @IsNotEmpty()
  @IsString()
  name!: string

  @ApiProperty({ description: 'Abreviatura del equipo', example: 'BOC' })
  @IsNotEmpty()
  @IsString()
  short!: string // Ej: "BOC"

  @ApiProperty({ description: 'URL del escudo del equipo' })
  @IsNotEmpty()
  @IsString()
  logoUrl!: string
}

class MarketMetadataDto {
  @ApiProperty({ type: TeamMetadataDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => TeamMetadataDto)
  homeTeam?: TeamMetadataDto

  @ApiProperty({ type: TeamMetadataDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => TeamMetadataDto)
  awayTeam?: TeamMetadataDto
}

class MarketOptionDto {
  @ApiProperty({ description: 'Nombre de la opción (ej. "Boca gana")' })
  @IsNotEmpty()
  @IsString()
  name!: string

  @ApiProperty({
    description: 'Probabilidad inicial de la opción (0-100)',
    minimum: 0,
    maximum: 100,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(100)
  initialProb!: number
}

export class CreateMarketDto {
  @ApiProperty({ description: 'Título del mercado' })
  @IsNotEmpty()
  @IsString()
  title!: string

  @ApiProperty({ enum: MarketType, required: false })
  @IsOptional()
  @IsEnum(MarketType)
  type?: MarketType

  @ApiProperty({ description: 'Categoría del mercado', required: false })
  @IsOptional()
  @IsString()
  category?: string

  @ApiProperty({ description: 'Descripción del mercado', required: false })
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty({ type: MarketMetadataDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => MarketMetadataDto)
  metadata?: MarketMetadataDto

  @ApiProperty({
    description: 'ID del fixture de API-Football asociado, si corresponde',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  fixtureId?: number

  @ApiProperty({
    description:
      'Fecha/hora ISO en que cierra el mercado (deja de aceptar apuestas)',
  })
  @IsNotEmpty()
  @IsDateString()
  closesAt!: string

  @ApiProperty({
    type: [MarketOptionDto],
    description: 'Opciones disponibles para apostar',
  })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MarketOptionDto)
  options!: MarketOptionDto[]
}
