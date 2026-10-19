import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator'
import { ItemType } from '@prisma/client'
import { ApiProperty } from '@nestjs/swagger'

export class CreateStoreItemDto {
  @ApiProperty({ description: 'Nombre del artículo' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre del artículo es obligatorio.' })
  name: string

  @ApiProperty({ description: 'Descripción del artículo' })
  @IsString()
  @IsNotEmpty({ message: 'La descripción es obligatoria.' })
  description: string

  @ApiProperty({ description: 'Precio en monedas', minimum: 0 })
  @IsInt({ message: 'El precio debe ser un número entero.' })
  @Min(0, { message: 'El precio mínimo no puede ser menor a 0 monedas.' })
  price: number

  @ApiProperty({ enum: ItemType, description: 'Tipo de ítem' })
  @IsEnum(ItemType, {
    message:
      'El tipo de ítem debe ser uno de los permitidos: STICKER_PACK, NAME_COLOR, BANNER, CHAT_BUBBLE, MEGAPHONE o CUSTOM_POLL.',
  })
  type: ItemType

  @ApiProperty({
    description:
      'Identificador del asset (código hex de color, id del sticker o path del banner)',
  })
  @IsString()
  @IsNotEmpty({
    message:
      'El assetId es obligatorio (ej: código hex de color, id del sticker o path del banner).',
  })
  assetId: string

  @ApiProperty({
    description: 'Si el ítem está visible en la tienda',
    required: false,
  })
  @IsOptional()
  isActive?: boolean

  @ApiProperty({
    description: 'Si el ítem puede comprarse actualmente',
    required: false,
  })
  @IsOptional()
  isPurchasable?: boolean
}
