import { IsNotEmpty, IsNumber, IsString, IsUUID, Min } from 'class-validator'

export class AdminAddCoinsDto {
  @IsNotEmpty({ message: 'El userId no puede estar vacío' })
  @IsUUID('4', { message: 'El userId debe ser un UUID válido' })
  userId!: string

  @IsNotEmpty({ message: 'El monto no puede estar vacío' })
  @IsNumber({}, { message: 'El monto debe ser un número entero' })
  @Min(1, { message: 'El monto mínimo a agregar es 1 moneda' })
  amount!: number

  @IsNotEmpty({ message: 'La descripción no puede estar vacía' })
  @IsString({ message: 'La descripción debe ser un texto' })
  description!: string
}
