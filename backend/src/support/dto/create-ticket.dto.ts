import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { TicketCategory } from '@prisma/client'
import {
  CLOUDINARY_URL_PATTERN,
  TICKET_MESSAGE_MAX_LENGTH,
  TICKET_SUBJECT_MAX_LENGTH,
} from '../support.constants'

export class CreateTicketDto {
  @ApiProperty({ enum: TicketCategory, example: 'SUPPORT' })
  @IsEnum(TicketCategory, { message: 'Categoría de ticket inválida.' })
  @IsNotEmpty()
  category: TicketCategory

  @ApiProperty({
    example: 'Error al procesar el pago de la suscripción',
    maxLength: TICKET_SUBJECT_MAX_LENGTH,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5, { message: 'El asunto debe tener al menos 5 caracteres.' })
  @MaxLength(TICKET_SUBJECT_MAX_LENGTH, {
    message: `El asunto no puede superar los ${TICKET_SUBJECT_MAX_LENGTH} caracteres.`,
  })
  subject: string

  @ApiProperty({
    example:
      'Adjunto captura de pantalla donde se visualiza el descuento pero no el alta.',
    maxLength: TICKET_MESSAGE_MAX_LENGTH,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, {
    message: 'El mensaje inicial debe tener al menos 10 caracteres.',
  })
  @MaxLength(TICKET_MESSAGE_MAX_LENGTH, {
    message: `El mensaje no puede superar los ${TICKET_MESSAGE_MAX_LENGTH} caracteres.`,
  })
  message: string

  @ApiProperty({
    required: false,
    example:
      'https://res.cloudinary.com/demo/image/upload/support_tickets/evidencia.png',
  })
  @IsOptional()
  @IsUrl({}, { message: 'La URL de la evidencia visual no es válida.' })
  @Matches(CLOUDINARY_URL_PATTERN, {
    message: 'La evidencia visual tiene que estar subida a Cloudinary.',
  })
  screenshotUrl?: string
}
