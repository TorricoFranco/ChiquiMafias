import { IsArray, IsString, IsNotEmpty } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class MarkAsReadDto {
  @ApiProperty({
    type: [String],
    description: 'IDs de las notificaciones a marcar como leídas',
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  ids: string[]
}
