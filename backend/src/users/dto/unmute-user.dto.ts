import { IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class UnmuteUserDto {
  @ApiProperty({ description: 'ID del usuario a desmutear' })
  @IsString()
  userId: string
}
