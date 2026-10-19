import {
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsUUID,
  Equals,
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

  @ApiProperty({
    description:
      'Aceptación de los Términos, la Política de Privacidad y declaración de ser mayor de 18 años',
    example: true,
  })
  @Equals(true, {
    message:
      'Tenés que aceptar los Términos y confirmar que sos mayor de 18 años',
  })
  acceptTerms: boolean
}
