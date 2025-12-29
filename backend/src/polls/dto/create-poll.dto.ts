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
  @IsInt()
  id: number

  @IsString()
  label: string
}

export class CreatePollDto {
  @IsString()
  title: string

  @IsOptional()
  @IsString()
  description?: string

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => PollOptionDto)
  options: PollOptionDto[]

  @IsDateString()
  startsAt: string

  @IsDateString()
  endsAt: string

  @IsOptional()
  @IsString()
  icon?: string
}
