import { IsString, IsNotEmpty, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateCommentDto {
  @ApiProperty({
    description: 'Texto del comentario',
    example: '¡Qué buena encuesta!',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200, {
    message: 'El comentario no puede superar los 200 caracteres',
  })
  text: string
}
