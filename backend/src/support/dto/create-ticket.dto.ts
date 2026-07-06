import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { TicketCategory } from '@prisma/client'

export class CreateTicketDto {
  @ApiProperty({ enum: TicketCategory, example: 'SUPPORT' })
  @IsEnum(TicketCategory, { message: 'Categoría de ticket inválida.' })
  @IsNotEmpty()
  category: TicketCategory

  @ApiProperty({ example: 'Error al procesar el pago de la suscripción' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5, { message: 'El asunto debe tener al menos 5 caracteres.' })
  subject: string

  @ApiProperty({
    example:
      'Adjunto captura de pantalla donde se visualiza el descuento pero no el alta.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, {
    message: 'El mensaje inicial debe tener al menos 10 caracteres.',
  })
  message: string

  @ApiProperty({
    required: false,
    example: 'https://cloudinary.com/storage/uploads/evidencia.png',
  })
  @IsOptional()
  @IsUrl({}, { message: 'La URL de la evidencia visual no es válida.' })
  screenshotUrl?: string
}
