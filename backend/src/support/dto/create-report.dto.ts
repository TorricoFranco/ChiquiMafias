import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { ReportReason } from '@prisma/client'

export class CreateReportDto {
  @ApiProperty({ example: 'usr_uuid_del_denunciado' })
  @IsUUID()
  @IsNotEmpty()
  reportedId: string

  @ApiProperty({ enum: ReportReason, example: 'TOXIC_CHAT' })
  @IsEnum(ReportReason, { message: 'Motivo de reporte inválido.' })
  @IsNotEmpty()
  reason: ReportReason

  @ApiProperty({
    example: 'Utilizó insultos xenófobos en el chat de la sala de juego.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, {
    message: 'El detalle debe contener un mínimo de 10 caracteres.',
  })
  details: string
}
