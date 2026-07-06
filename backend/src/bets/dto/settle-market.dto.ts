import { IsNotEmpty, IsEnum, IsOptional, IsUUID } from 'class-validator'
import { MarketStatus } from '@prisma/client'

export class SettleMarketDto {
  @IsNotEmpty()
  @IsEnum(['SETTLED', 'REFUNDED'], {
    message: 'El estado final debe ser SETTLED o REFUNDED',
  })
  status!: Extract<MarketStatus, 'SETTLED' | 'REFUNDED'>

  @IsOptional()
  @IsUUID('4', {
    message: 'El ID de la opción ganadora debe ser un UUID válido',
  })
  winningOptionId?: string
}
