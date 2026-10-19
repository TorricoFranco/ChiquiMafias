import {
  IsString,
  IsOptional,
  IsBoolean,
  ValidateIf,
  MaxLength,
} from 'class-validator'

export class SendMessageDto {
  @ValidateIf((o) => !o.stickerId)
  @IsString({ message: 'El mensaje debe ser un texto válido' })
  @MaxLength(100, { message: 'El mensaje no puede superar los 100 caracteres' })
  body: string

  @IsOptional()
  @IsString()
  stickerId?: string

  @IsOptional()
  @IsBoolean()
  useMegaphone?: boolean
}
