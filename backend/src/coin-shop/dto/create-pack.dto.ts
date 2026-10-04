import { IsString, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator'

export class CreatePackDto {
  @IsString()
  name: string

  @IsString()
  @IsOptional()
  description?: string

  @IsNumber()
  @Min(1)
  coinsAmount: number

  @IsNumber()
  @IsOptional()
  @Min(0)
  bonusCoins?: number = 0

  @IsNumber()
  @Min(1)
  priceARS: number

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true

  @IsBoolean()
  @IsOptional()
  isPopular?: boolean = false
}
