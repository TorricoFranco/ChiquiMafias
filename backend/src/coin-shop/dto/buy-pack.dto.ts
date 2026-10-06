import { IsUUID } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class BuyPackDto {
  @ApiProperty({
    description: 'ID del pack de monedas a comprar',
    format: 'uuid',
  })
  @IsUUID()
  packId: string
}
