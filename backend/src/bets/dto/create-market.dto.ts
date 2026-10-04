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
  IsObject
} from 'class-validator'
import { Type } from 'class-transformer'
import { MarketType } from '@prisma/client'

class TeamMetadataDto {
  @IsNotEmpty()
  @IsString()
  name!: string      

  @IsNotEmpty()
  @IsString()
  short!: string     // Ej: "BOC"

  @IsNotEmpty()
  @IsString()
  logoUrl!: string  
}

class MarketMetadataDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => TeamMetadataDto)
  homeTeam?: TeamMetadataDto

  @IsOptional()
  @ValidateNested()
  @Type(() => TeamMetadataDto)
  awayTeam?: TeamMetadataDto
}

class MarketOptionDto {
  @IsNotEmpty()
  @IsString()
  name!: string

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(100)
  initialProb!: number
}

export class CreateMarketDto {
  @IsNotEmpty()
  @IsString()
  title!: string

  @IsOptional()
  @IsEnum(MarketType)
  type?: MarketType

  @IsOptional()
  @IsString()
  category?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @ValidateNested()
  @Type(() => MarketMetadataDto)
  metadata?: MarketMetadataDto

  @IsOptional()
  @IsNumber()
  fixtureId?: number 

  @IsNotEmpty()
  @IsDateString()
  closesAt!: string

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MarketOptionDto)
  options!: MarketOptionDto[]
}