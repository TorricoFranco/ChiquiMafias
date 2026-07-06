import { ApiProperty } from '@nestjs/swagger'

export class GetActiveMatchdayResponseDto {
  @ApiProperty({
    example: 'semifinal',
    description:
      'La jornada o fase activa por defecto para el Front. Puede ser el número de fecha ("1") o la instancia ("cuartos", "semifinal", etc.)',
  })
  active_matchday: string
}
