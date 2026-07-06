import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator'
import { ItemType } from '@prisma/client'

export class CreateStoreItemDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del artículo es obligatorio.' })
  name: string

  @IsString()
  @IsNotEmpty({ message: 'La descripción es obligatoria.' })
  description: string

  @IsInt({ message: 'El precio debe ser un número entero.' })
  @Min(0, { message: 'El precio mínimo no puede ser menor a 0 monedas.' })
  price: number

  @IsEnum(ItemType, {
    message:
      'El tipo de ítem debe ser uno de los permitidos: STICKER_PACK, NAME_COLOR, BANNER, MEGAPHONE o CUSTOM_POLL.',
  })
  type: ItemType

  @IsString()
  @IsNotEmpty({
    message:
      'El assetId es obligatorio (ej: código hex de color, id del sticker o path del banner).',
  })
  assetId: string

  @IsOptional()
  isActive?: boolean
}
