import {
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsUUID,
} from 'class-validator'

export class CompleteProfileDto {
  @IsString()
  @MinLength(3, { message: 'El username debe tener al menos 3 caracteres' })
  @MaxLength(15, { message: 'El username no puede superar los 15 caracteres' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'El username solo puede contener letras, números y guiones bajos',
  })
  username: string

  @IsUUID('4', { message: 'El ID del club seleccionado no es válido' })
  teamId: string
}
