import { IsEnum } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { TicketStatus } from '@prisma/client'

export class UpdateTicketStatusDto {
  @ApiProperty({ enum: TicketStatus, description: 'Nuevo estado del ticket' })
  @IsEnum(TicketStatus)
  status: TicketStatus
}
