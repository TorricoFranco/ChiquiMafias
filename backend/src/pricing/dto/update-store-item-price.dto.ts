import { IsInt, IsNotEmpty, Max, Min } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { PRICE_LIMITS } from '../constants/pricing.constants'

export class UpdateStoreItemPriceDto {
  @ApiProperty({
    description: 'Nuevo precio del ítem en monedas (ChiquiCoins)',
    example: 2500,
    minimum: PRICE_LIMITS.STORE_ITEM.MIN,
    maximum: PRICE_LIMITS.STORE_ITEM.MAX,
  })
  @IsNotEmpty({ message: 'El precio no puede estar vacío' })
  @IsInt({ message: 'El precio en monedas debe ser un número entero' })
  @Min(PRICE_LIMITS.STORE_ITEM.MIN, {
    message: `El precio mínimo es ${PRICE_LIMITS.STORE_ITEM.MIN} moneda`,
  })
  @Max(PRICE_LIMITS.STORE_ITEM.MAX, {
    message: `El precio no puede superar las ${PRICE_LIMITS.STORE_ITEM.MAX} monedas`,
  })
  price!: number
}
