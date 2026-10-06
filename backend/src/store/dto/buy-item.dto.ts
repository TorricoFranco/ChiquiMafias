import { IsInt, Min } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class BuyItemDto {
  @ApiProperty({
    description: 'Cantidad de unidades a comprar',
    minimum: 1,
    example: 1,
  })
  @IsInt({ message: 'La cantidad debe ser un número entero.' })
  @Min(1, { message: 'La cantidad mínima a comprar es 1.' })
  quantity: number
}
