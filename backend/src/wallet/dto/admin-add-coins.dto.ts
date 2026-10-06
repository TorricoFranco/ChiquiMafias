import { IsNotEmpty, IsNumber, IsString, IsUUID, Min } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class AdminAddCoinsDto {
  @ApiProperty({
    description: 'ID del usuario al que se le acreditan monedas',
    format: 'uuid',
  })
  @IsNotEmpty({ message: 'El userId no puede estar vacío' })
  @IsUUID('4', { message: 'El userId debe ser un UUID válido' })
  userId!: string

  @ApiProperty({
    description:
      'Cantidad de monedas a acreditar. Si el saldo resultante superaría el tope MAX_COIN_BALANCE (50000), se recorta en silencio a ese tope en vez de fallar.',
    example: 100,
    minimum: 1,
  })
  @IsNotEmpty({ message: 'El monto no puede estar vacío' })
  @IsNumber({}, { message: 'El monto debe ser un número entero' })
  @Min(1, { message: 'El monto mínimo a agregar es 1 moneda' })
  amount!: number

  @ApiProperty({
    description:
      'Motivo del acreditado, queda registrado en el CoinTransaction',
  })
  @IsNotEmpty({ message: 'La descripción no puede estar vacía' })
  @IsString({ message: 'La descripción debe ser un texto' })
  description!: string
}
