import {
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsNotEmpty,
} from 'class-validator'

export class CompleteProfileDto {
  @IsNotEmpty({ message: 'El nombre de usuario no puede estar vacío' })
  @IsString()
  @MinLength(3, {
    message: 'El nombre de usuario debe tener al menos 3 caracteres',
  })
  @MaxLength(15, {
    message: 'El nombre de usuario no puede exceder los 15 caracteres',
  })
  @Matches(/^[a-zA-Z0-0_]+$/, {
    message:
      'El nombre de usuario solo puede contener letras, números y guiones bajos',
  })
  username: string

  @IsNotEmpty({ message: 'Debes seleccionar un equipo' })
  @IsString()
  team: string // Por ahora lo dejamos como string, sea nombre o URL de imagen
}
