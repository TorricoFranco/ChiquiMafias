import { IsString, IsNotEmpty, IsOptional, IsBoolean, ValidateIf } from 'class-validator'

export class SendMatchMessageDto {
  @IsString()
  @IsNotEmpty()
  matchId: string

  @ValidateIf(o => !o.stickerId)
  @IsString()
  @IsNotEmpty({ message: 'El mensaje no puede estar vacío si no mandás un sticker' })
  message: string

  @IsOptional()
  @IsString()
  stickerId?: string

  @IsOptional()
  @IsBoolean()
  useMegaphone?: boolean
}