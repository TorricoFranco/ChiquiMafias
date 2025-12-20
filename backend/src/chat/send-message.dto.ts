import { IsString, IsNotEmpty, MaxLength } from 'class-validator'

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  body: string
}
