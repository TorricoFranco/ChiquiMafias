import { IsNotEmpty, IsEnum, IsOptional, IsUUID } from 'class-validator'
import { MarketStatus } from '@prisma/client'
import { ApiProperty } from '@nestjs/swagger'

export class SettleMarketDto {
  @ApiProperty({
    description:
      'Estado final del mercado: liquidar pagando ganadores o reembolsar a todos',
    enum: ['SETTLED', 'REFUNDED'],
  })
  @IsNotEmpty()
  @IsEnum(['SETTLED', 'REFUNDED'], {
    message: 'El estado final debe ser SETTLED o REFUNDED',
  })
  status!: Extract<MarketStatus, 'SETTLED' | 'REFUNDED'>

  @ApiProperty({
    description:
      'ID de la opción ganadora. Requerido cuando `status` es SETTLED.',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', {
    message: 'El ID de la opción ganadora debe ser un UUID válido',
  })
  winningOptionId?: string
}
