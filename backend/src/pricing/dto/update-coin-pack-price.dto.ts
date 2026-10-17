import { IsNotEmpty, IsNumber, Max, Min } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { PRICE_LIMITS } from '../constants/pricing.constants'

export class UpdateCoinPackPriceDto {
  @ApiProperty({
    description: 'Nuevo precio del pack en pesos argentinos (ARS)',
    example: 1500,
    minimum: PRICE_LIMITS.COIN_PACK.MIN,
    maximum: PRICE_LIMITS.COIN_PACK.MAX,
  })
  @IsNotEmpty({ message: 'El precio no puede estar vacío' })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El precio debe ser un número con hasta 2 decimales' },
  )
  @Min(PRICE_LIMITS.COIN_PACK.MIN, {
    message: `El precio no puede ser menor a $${PRICE_LIMITS.COIN_PACK.MIN} ARS`,
  })
  @Max(PRICE_LIMITS.COIN_PACK.MAX, {
    message: `El precio no puede superar los $${PRICE_LIMITS.COIN_PACK.MAX} ARS`,
  })
  priceARS!: number
}
