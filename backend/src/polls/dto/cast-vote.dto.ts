import { IsUUID, IsInt, IsNotEmpty } from 'class-validator'

export class CastVoteDto {
  @IsUUID('4', { message: 'El pollId debe ser un identificador válido' })
  @IsNotEmpty()
  pollId: string

  @IsInt({ message: 'El optionId debe ser un número entero' })
  @IsNotEmpty()
  optionId: number
}
