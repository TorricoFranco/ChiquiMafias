import { IsOptional } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CancelSubscriptionDto {
  @ApiProperty({ description: 'Motivo de la cancelación', required: false })
  @IsOptional()
  reason?: string
}
