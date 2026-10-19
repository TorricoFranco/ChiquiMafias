import { IsNotEmpty, IsNumber, Max, Min } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { PRICE_LIMITS } from '../constants/pricing.constants'

export class UpdateSubscriptionPlanPriceDto {
  @ApiProperty({
    description:
      'Nuevo precio base del plan en pesos argentinos (ARS). Los descuentos de fin de semana y de domingo VIP se calculan sobre este valor.',
    example: 4000,
    minimum: PRICE_LIMITS.SUBSCRIPTION_PLAN.MIN,
    maximum: PRICE_LIMITS.SUBSCRIPTION_PLAN.MAX,
  })
  @IsNotEmpty({ message: 'El precio base no puede estar vacío' })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El precio base debe ser un número con hasta 2 decimales' },
  )
  @Min(PRICE_LIMITS.SUBSCRIPTION_PLAN.MIN, {
    message: `El precio base no puede ser menor a $${PRICE_LIMITS.SUBSCRIPTION_PLAN.MIN} ARS: un plan en $0 rompe el checkout de Mercado Pago`,
  })
  @Max(PRICE_LIMITS.SUBSCRIPTION_PLAN.MAX, {
    message: `El precio base no puede superar los $${PRICE_LIMITS.SUBSCRIPTION_PLAN.MAX} ARS`,
  })
  basePriceARS!: number
}
