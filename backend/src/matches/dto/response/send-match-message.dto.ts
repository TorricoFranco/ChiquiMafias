import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator'

export class SendMatchMessageDto {
  @IsString()
  @IsNotEmpty()
  matchId?: string

  @IsString()
  @IsNotEmpty()
  message: string

  @IsOptional()
  @IsString()
  stickerId?: string

  @IsOptional()
  @IsBoolean()
  useMegaphone?: boolean
}
