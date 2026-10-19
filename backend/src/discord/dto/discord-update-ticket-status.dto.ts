import { IsEnum, IsNotEmpty, IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { TicketStatus } from '@prisma/client'

export class DiscordUpdateTicketStatusDto {
  @ApiProperty({ description: 'ID del ticket' })
  @IsString()
  @IsNotEmpty()
  ticketId: string

  @ApiProperty({ enum: TicketStatus, description: 'Nuevo estado del ticket' })
  @IsEnum(TicketStatus)
  status: TicketStatus
}
