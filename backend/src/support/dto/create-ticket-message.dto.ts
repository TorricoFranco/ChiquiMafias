import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import {
  CLOUDINARY_URL_PATTERN,
  TICKET_MESSAGE_MAX_LENGTH,
} from '../support.constants'

export class CreateTicketMessageDto {
  @ApiProperty({
    example: 'Perfecto, sigo a la espera de una respuesta del administrador.',
    maxLength: TICKET_MESSAGE_MAX_LENGTH,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'El mensaje debe tener al menos 2 caracteres.' })
  @MaxLength(TICKET_MESSAGE_MAX_LENGTH, {
    message: `El mensaje no puede superar los ${TICKET_MESSAGE_MAX_LENGTH} caracteres.`,
  })
  message: string

  @ApiProperty({
    required: false,
    example:
      'https://res.cloudinary.com/demo/image/upload/support_tickets/evidencia2.png',
  })
  @IsOptional()
  @IsUrl({}, { message: 'La URL de la evidencia visual no es válida.' })
  @Matches(CLOUDINARY_URL_PATTERN, {
    message: 'La evidencia visual tiene que estar subida a Cloudinary.',
  })
  screenshotUrl?: string
}
