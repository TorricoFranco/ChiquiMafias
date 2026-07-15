import { IsNotEmpty, IsUUID, IsInt, Min } from 'class-validator'
export class CreateBetDto {
  @IsNotEmpty({ message: 'Debe especificar el ID del mercado' })
  @IsUUID('4', { message: 'El ID del mercado debe ser un UUID válido' })
  marketId!: string

  @IsNotEmpty({ message: 'Debe especificar el ID de la opción' })
  @IsUUID('4', { message: 'El ID de la opción debe ser un UUID válido' })
  optionId!: string

  @IsNotEmpty({ message: 'Debe especificar el monto de la apuesta' })
  @IsInt({ message: 'El monto de la apuesta debe ser un número entero' })
  @Min(10, { message: 'La apuesta mínima es de 10 monedas' })
  stake!: number
}
