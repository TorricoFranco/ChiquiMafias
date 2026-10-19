import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { NotifyType } from '@prisma/client'

export class CreateAdminGlobalNotificationDto {
  @ApiProperty({ description: 'Título de la notificación (máx 80 caracteres)' })
  @IsString()
  @IsNotEmpty({ message: 'El título no puede estar vacío.' })
  @MaxLength(80, {
    message: 'El título es demasiado largo (máx 80 caracteres).',
  })
  title: string

  @ApiProperty({ description: 'Cuerpo del mensaje (máx 500 caracteres)' })
  @IsString()
  @IsNotEmpty({ message: 'El cuerpo del mensaje es requerido.' })
  @MaxLength(500, {
    message: 'El mensaje no puede superar los 500 caracteres.',
  })
  message: string

  @ApiProperty({ enum: NotifyType, description: 'Tipo de notificación' })
  @IsEnum(NotifyType, { message: 'El tipo de notificación no es válido.' })
  type: NotifyType

  @ApiProperty({
    description: 'Metadata libre asociada a la notificación',
    required: false,
  })
  @IsOptional()
  metadata?: Record<string, any>
}

export class CreateAdminPersonalNotificationDto extends CreateAdminGlobalNotificationDto {
  @ApiProperty({ description: 'ID del usuario destinatario', format: 'uuid' })
  @IsUUID('4', { message: 'El ID del destinatario debe ser un UUID válido.' })
  @IsNotEmpty()
  userId: string

  @ApiProperty({
    description: 'ID de referencia opcional (ej. entidad relacionada)',
    required: false,
  })
  @IsString()
  @IsOptional()
  referenceId?: string
}
