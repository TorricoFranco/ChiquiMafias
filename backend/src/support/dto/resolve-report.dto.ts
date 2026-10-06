import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class ResolveReportDto {
  @ApiProperty({
    description: 'Acción de moderación a aplicar sobre el usuario reportado',
    enum: ['BAN', 'MUTE', 'WARN', 'UNBAN'],
  })
  @IsIn(['BAN', 'MUTE', 'WARN', 'UNBAN'], {
    message: 'La acción debe ser BAN, MUTE, WARN o UNBAN',
  })
  action: 'BAN' | 'MUTE' | 'WARN' | 'UNBAN'

  @ApiProperty({
    description: 'Duración de la sanción en horas, para BAN o MUTE',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationHours?: number

  @ApiProperty({
    description: 'Motivo de la acción de moderación',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string
}
