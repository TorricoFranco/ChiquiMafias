// import { IsString, IsOptional, IsBoolean } from 'class-validator'

// export class SendMessageDto {
//   @IsString()
//   body: string

//   @IsOptional()
//   @IsString()
//   stickerId?: string

//   @IsOptional()
//   @IsBoolean()
//   useMegaphone?: boolean
// }

import { IsString, IsOptional, IsBoolean, ValidateIf } from 'class-validator'

export class SendMessageDto {
  @ValidateIf((o) => !o.stickerId)
  @IsString({ message: 'El mensaje debe ser un texto válido' })
  body: string

  @IsOptional()
  @IsString()
  stickerId?: string

  @IsOptional()
  @IsBoolean()
  useMegaphone?: boolean
}
