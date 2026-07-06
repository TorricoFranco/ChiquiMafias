import { IsString, IsEnum } from 'class-validator'

export enum TimeoutDuration {
  FIVE_MIN = 5,
  FIFTEEN_MIN = 15,
  ONE_HOUR = 60,
  TWENTY_FOUR_HOURS = 1440,
}

export class TimeoutDto {
  @IsString()
  userId: string

  @IsEnum(TimeoutDuration) 
  durationMinutes: TimeoutDuration
}
