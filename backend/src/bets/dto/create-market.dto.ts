import {
  IsNotEmpty,
  IsString,
  IsDateString,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  Max,
} from 'class-validator'
import { Type } from 'class-transformer'

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

  @IsNotEmpty()
  @IsDateString()
  closesAt!: string

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MarketOptionDto)
  options!: MarketOptionDto[]
}
