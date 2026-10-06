import {
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsUUID,
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CompleteProfileDto {
  @ApiProperty({
    description:
      'Nombre de usuario (3-15 caracteres, letras/números/guion bajo)',
    example: 'messi_10',
  })
  @IsString()
  @MinLength(3, { message: 'El username debe tener al menos 3 caracteres' })
  @MaxLength(15, { message: 'El username no puede superar los 15 caracteres' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'El username solo puede contener letras, números y guiones bajos',
  })
  username: string

  @ApiProperty({
    description: 'ID del club elegido como equipo favorito',
    format: 'uuid',
    required: false,
  })
  @IsUUID('4', { message: 'El ID del club seleccionado no es válido' })
  teamId?: string
}
