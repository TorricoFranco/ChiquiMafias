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

export class CreateStoreDiscountDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del descuento es obligatorio.' })
  name: string

  @IsInt({ message: 'El porcentaje debe ser un número entero.' })
  @Min(1, { message: 'El descuento mínimo debe ser del 1%.' })
  @Max(100, { message: 'El descuento máximo no puede superar el 100%.' })
  percentage: number

  @IsEnum(DiscountScope, {
    message:
      'El alcance debe ser uno de los permitidos: ALL, BY_TYPE o SPECIFIC_ITEM.',
  })
  scope: DiscountScope

  @IsOptional()
  @IsEnum(ItemType, { message: 'El tipo de ítem de destino no es válido.' })
  targetType?: ItemType

  @IsOptional()
  @IsUUID('4', { message: 'El ID del producto debe ser un UUID válido.' })
  targetItemId?: string

  @IsDateString(
    {},
    {
      message:
        'La fecha de inicio debe tener un formato de fecha válido (ISO 8601).',
    },
  )
  startDate: string

  @IsDateString(
    {},
    {
      message:
        'La fecha de fin debe tener un formato de fecha válido (ISO 8601).',
    },
  )
  endDate: string

  @IsOptional()
  isActive?: boolean
}
