import { IsString, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreatePackDto {
  @ApiProperty({ description: 'Nombre del pack de monedas' })
  @IsString()
  name: string

  @ApiProperty({ description: 'Descripción del pack', required: false })
  @IsString()
  @IsOptional()
  description?: string

  @ApiProperty({
    description: 'Cantidad de monedas que otorga el pack',
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  coinsAmount: number

  @ApiProperty({
    description: 'Monedas extra de bonificación',
    minimum: 0,
    default: 0,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  bonusCoins?: number = 0

  @ApiProperty({
    description: 'Precio del pack en pesos argentinos (ARS)',
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  priceARS: number

  @ApiProperty({
    description: 'Si el pack está visible/comprable en la tienda',
    default: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true

  @ApiProperty({
    description: 'Si el pack se marca como "popular" en la UI',
    default: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isPopular?: boolean = false
}
