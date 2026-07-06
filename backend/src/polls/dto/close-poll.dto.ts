import { ApiProperty } from '@nestjs/swagger'

export class ClosePollResponseDto {
  @ApiProperty({
    example: 'Encuesta cerrada correctamente por el administrador.',
  })
  message: string

  @ApiProperty({
    example: '5dcc00f3-b889-4e38-b89d-4608bc04c464',
    description: 'ID de la encuesta afectada',
  })
  pollId: string

  @ApiProperty({
    example: 'CLOSED',
    description: 'Nuevo estado de la encuesta',
  })
  status: string
}
