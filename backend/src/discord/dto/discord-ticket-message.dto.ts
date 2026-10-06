import { IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class DiscordTicketMessageDto {
  @ApiProperty({ description: 'ID del ticket al que se responde' })
  @IsString()
  @IsNotEmpty()
  ticketId: string

  @ApiProperty({ description: 'ID de Discord de quien envía el mensaje' })
  @IsString()
  @IsNotEmpty()
  senderId: string

  @ApiProperty({
    description:
      'Texto del mensaje. Opcional si se adjunta screenshotUrl (ej. el staff manda solo una captura).',
    required: false,
  })
  @IsOptional()
  @IsString()
  message?: string

  @ApiProperty({
    description: 'URL de captura de pantalla adjunta, si corresponde',
    required: false,
  })
  @IsOptional()
  @IsString()
  screenshotUrl?: string
}
