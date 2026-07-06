import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateTicketMessageDto {
  @ApiProperty({
    example: 'Perfecto, sigo a la espera de una respuesta del administrador.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'El mensaje debe tener al menos 2 caracteres.' })
  message: string

  @ApiProperty({
    required: false,
    example: 'https://cloudinary.com/storage/uploads/evidencia2.png',
  })
  @IsOptional()
  @IsUrl({}, { message: 'La URL de la evidencia visual no es válida.' })
  screenshotUrl?: string
}
