import { IsString, IsEnum } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export enum TimeoutDuration {
  FIVE_MIN = 5,
  FIFTEEN_MIN = 15,
  ONE_HOUR = 60,
  TWENTY_FOUR_HOURS = 1440,
}

export class TimeoutDto {
  @ApiProperty({ description: 'ID del usuario a silenciar (timeout)' })
  @IsString()
  userId: string

  @ApiProperty({
    enum: TimeoutDuration,
    description: 'Duración del timeout en minutos',
  })
  @IsEnum(TimeoutDuration)
  durationMinutes: TimeoutDuration
}
