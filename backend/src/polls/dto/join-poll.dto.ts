import { IsUUID, IsNotEmpty } from 'class-validator'

export class JoinPollDto {
  @IsUUID('4', { message: 'El pollId debe ser un identificador válido' })
  @IsNotEmpty()
  pollId: string
}
