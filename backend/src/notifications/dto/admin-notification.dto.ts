import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator'
import { NotifyType } from '@prisma/client'

export class CreateAdminGlobalNotificationDto {
  @IsString()
  @IsNotEmpty({ message: 'El título no puede estar vacío.' })
  @MaxLength(80, {
    message: 'El título es demasiado largo (máx 80 caracteres).',
  })
  title: string

  @IsString()
  @IsNotEmpty({ message: 'El cuerpo del mensaje es requerido.' })
  @MaxLength(500, {
    message: 'El mensaje no puede superar los 500 caracteres.',
  })
  message: string

  @IsEnum(NotifyType, { message: 'El tipo de notificación no es válido.' })
  type: NotifyType

  @IsOptional()
  metadata?: Record<string, any>
}

export class CreateAdminPersonalNotificationDto extends CreateAdminGlobalNotificationDto {
  @IsUUID('4', { message: 'El ID del destinatario debe ser un UUID válido.' })
  @IsNotEmpty()
  userId: string

  @IsString()
  @IsOptional()
  referenceId?: string
}
