import { ApiProperty } from '@nestjs/swagger'

export class AvailableStagesResponseDto {
  @ApiProperty({
    example: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    description: 'Lista de los números de fecha disponibles de la fase regular',
    type: [Number],
  })
  regular: number[]

  @ApiProperty({
    example: ['octavos', 'cuartos', 'semifinal', 'final'],
    description:
      'Etapas de playoff que ya tienen partidos generados o jugándose',
    type: [String],
  })
  playoffs: string[]
}
