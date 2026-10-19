import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  IsDateString,
} from 'class-validator'
import { DiscountScope, ItemType } from '@prisma/client'
import { ApiProperty } from '@nestjs/swagger'

export class CreateStoreDiscountDto {
  @ApiProperty({ description: 'Nombre de la campaña de descuento' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre del descuento es obligatorio.' })
  name: string

  @ApiProperty({
    description: 'Porcentaje de descuento',
    minimum: 1,
    maximum: 100,
  })
  @IsInt({ message: 'El porcentaje debe ser un número entero.' })
  @Min(1, { message: 'El descuento mínimo debe ser del 1%.' })
  @Max(100, { message: 'El descuento máximo no puede superar el 100%.' })
  percentage: number

  @ApiProperty({
    enum: DiscountScope,
    description:
      'Alcance del descuento: a toda la tienda, por tipo de ítem o a un ítem específico',
  })
  @IsEnum(DiscountScope, {
    message:
      'El alcance debe ser uno de los permitidos: ALL, BY_TYPE o SPECIFIC_ITEM.',
  })
  scope: DiscountScope

  @ApiProperty({
    enum: ItemType,
    description: 'Tipo de ítem objetivo, requerido cuando scope es BY_TYPE',
    required: false,
  })
  @IsOptional()
  @IsEnum(ItemType, { message: 'El tipo de ítem de destino no es válido.' })
  targetType?: ItemType

  @ApiProperty({
    description:
      'ID del ítem objetivo, requerido cuando scope es SPECIFIC_ITEM',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'El ID del producto debe ser un UUID válido.' })
  targetItemId?: string

  @ApiProperty({ description: 'Fecha/hora ISO de inicio de la campaña' })
  @IsDateString(
    {},
    {
      message:
        'La fecha de inicio debe tener un formato de fecha válido (ISO 8601).',
    },
  )
  startDate: string

  @ApiProperty({ description: 'Fecha/hora ISO de fin de la campaña' })
  @IsDateString(
    {},
    {
      message:
        'La fecha de fin debe tener un formato de fecha válido (ISO 8601).',
    },
  )
  endDate: string

  @ApiProperty({ description: 'Si la campaña está activa', required: false })
  @IsOptional()
  isActive?: boolean
}
