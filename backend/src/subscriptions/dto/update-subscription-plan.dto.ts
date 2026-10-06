import {
  IsOptional,
  IsArray,
  IsString,
  IsInt,
  Min,
  Max,
  IsNumber,
  IsBoolean,
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class UpdateSubscriptionPlanDto {
  @ApiProperty({
    type: [String],
    description: 'Lista de beneficios del plan',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[]

  @ApiProperty({
    description: 'Porcentaje de descuento en la tienda para este plan',
    minimum: 0,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  storeDiscountPercentage?: number

  @ApiProperty({
    description: 'Precio base del plan en pesos argentinos (ARS)',
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  basePriceARS?: number

  @ApiProperty({ description: 'Nombre visible del plan', required: false })
  @IsOptional()
  @IsString()
  name?: string

  @ApiProperty({
    description: 'Si el plan está disponible para compra',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
