import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class DiscordActionDto {
  @ApiProperty({ description: 'ID del reporte a resolver' })
  @IsString()
  @IsNotEmpty()
  reportId: string

  @ApiProperty({ description: 'ID de Discord del admin que ejecuta la acción' })
  @IsString()
  @IsNotEmpty()
  adminDiscordId: string

  @ApiProperty({
    description: 'Acción de moderación a aplicar',
    enum: ['BAN', 'MUTE', 'WARN', 'UNBAN'],
  })
  @IsIn(['BAN', 'MUTE', 'WARN', 'UNBAN'])
  action: 'BAN' | 'MUTE' | 'WARN' | 'UNBAN'

  @ApiProperty({
    description: 'Duración de la sanción en horas, para BAN o MUTE',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationHours?: number

  @ApiProperty({ description: 'Motivo de la acción', required: false })
  @IsOptional()
  @IsString()
  reason?: string
}
