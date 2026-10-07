import { IsEnum, IsNotEmpty } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { ReactionType } from '@prisma/client'

export class ReactDto {
  @ApiProperty({
    enum: ReactionType,
    description: 'Tipo de reacción: LIKE o DISLIKE',
  })
  @IsEnum(ReactionType)
  @IsNotEmpty()
  type: ReactionType
}
