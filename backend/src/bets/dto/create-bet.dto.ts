import { IsNotEmpty, IsUUID, IsInt, Min } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateBetDto {
  @ApiProperty({
    description: 'ID del mercado sobre el que se apuesta',
    format: 'uuid',
  })
  @IsNotEmpty({ message: 'Debe especificar el ID del mercado' })
  @IsUUID('4', { message: 'El ID del mercado debe ser un UUID válido' })
  marketId!: string

  @ApiProperty({
    description: 'ID de la opción elegida dentro del mercado',
    format: 'uuid',
  })
  @IsNotEmpty({ message: 'Debe especificar el ID de la opción' })
  @IsUUID('4', { message: 'El ID de la opción debe ser un UUID válido' })
  optionId!: string

  @ApiProperty({
    description: 'Monto a apostar en monedas (mínimo 10)',
    example: 50,
    minimum: 10,
  })
  @IsNotEmpty({ message: 'Debe especificar el monto de la apuesta' })
  @IsInt({ message: 'El monto de la apuesta debe ser un número entero' })
  @Min(10, { message: 'La apuesta mínima es de 10 monedas' })
  stake!: number
}
