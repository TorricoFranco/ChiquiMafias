import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  IsUUID,
  Length,
  ValidateIf,
} from 'class-validator'

export class LoadDrawDto {
  @ApiProperty({
    description:
      'Cruces de la primera ronda en el orden oficial del cuadro, de arriba hacia abajo, con los nombres de los equipos.',
    example: [
      ['River Plate', 'Ciudad de Bolívar'],
      ['Gimnasia M.', 'Gimnasia Y Tiro'],
    ],
  })
  @IsArray({ message: '"firstRound" tiene que ser una lista de cruces' })
  @ArrayMinSize(1, { message: 'Falta la lista de cruces' })
  @ArrayMaxSize(64, { message: 'Demasiados cruces' })
  @IsArray({
    each: true,
    message: 'Cada cruce es una lista [local, visitante]',
  })
  @ArrayMinSize(2, { each: true, message: 'Cada cruce tiene dos equipos' })
  @ArrayMaxSize(2, { each: true, message: 'Cada cruce tiene dos equipos' })
  // Que cada equipo sea un nombre de texto lo valida el servicio: `each` de
  // class-validator mira un solo nivel de la lista.
  firstRound!: string[][]
}

export class CorrectSlotDto {
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Equipo de arriba. Omitido: no cambia. null: por definir.',
  })
  @ValidateIf(
    (o: CorrectSlotDto) => o.homeTeamId !== undefined && o.homeTeamId !== null,
  )
  @IsUUID('4', { message: '"homeTeamId" tiene que ser el id de un equipo' })
  homeTeamId?: string | null

  @ApiPropertyOptional({ type: String, nullable: true })
  @ValidateIf(
    (o: CorrectSlotDto) => o.awayTeamId !== undefined && o.awayTeamId !== null,
  )
  @IsUUID('4', { message: '"awayTeamId" tiene que ser el id de un equipo' })
  awayTeamId?: string | null

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Ganador: uno de los dos equipos de la llave, o null.',
  })
  @ValidateIf(
    (o: CorrectSlotDto) =>
      o.winnerTeamId !== undefined && o.winnerTeamId !== null,
  )
  @IsUUID('4', { message: '"winnerTeamId" tiene que ser el id de un equipo' })
  winnerTeamId?: string | null

  @ApiProperty({
    example: 'Ganó en escritorio (W.O.) y el proveedor no lo informa',
  })
  @IsString({ message: 'Contá por qué se corrige la llave' })
  @Length(5, 300, {
    message: 'El motivo tiene que tener entre 5 y 300 caracteres',
  })
  reason!: string
}

export class ClearCorrectionDto {
  @ApiProperty({ example: 'El proveedor ya informa el resultado correcto' })
  @IsString({ message: 'Contá por qué se quita la corrección' })
  @Length(5, 300, {
    message: 'El motivo tiene que tener entre 5 y 300 caracteres',
  })
  reason!: string
}
