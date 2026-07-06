import { IsDateString, IsNotEmpty } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class ApprovePollDto {
  @ApiProperty({ example: '2026-06-16T12:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  startsAt: string

  @ApiProperty({ example: '2026-06-17T12:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  endsAt: string
}
