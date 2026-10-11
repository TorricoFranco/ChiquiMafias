import {
  IsUUID,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class CastVoteDto {
  @IsUUID('4', { message: 'El pollId debe ser un identificador válido' })
  @IsNotEmpty()
  pollId: string

  @ApiPropertyOptional({
    description:
      'Opción elegida. En RATING es la cantidad de estrellas. No se manda en RANKING',
  })
  @IsOptional()
  @IsInt({ message: 'El optionId debe ser un número entero' })
  optionId?: number

  @ApiPropertyOptional({
    example: [3, 1, 5],
    description: 'Solo RANKING: las opciones elegidas, en orden de podio',
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true, message: 'El ranking son ids de opción' })
  @ArrayMinSize(1)
  @ArrayMaxSize(6)
  ranking?: number[]
}
