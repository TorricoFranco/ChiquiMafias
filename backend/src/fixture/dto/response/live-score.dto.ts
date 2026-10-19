import { ApiProperty } from '@nestjs/swagger'

export class GetLiveScoresResponseDto {
  @ApiProperty({
    example: '03adeb55-8d7a-4947-9333-8366de4a1517',
    description: 'ID único del partido',
  })
  matchId: string

  @ApiProperty({
    example: 2,
    description: 'Goles del equipo local (home_goals)',
  })
  h: number

  @ApiProperty({
    example: 1,
    description: 'Goles del equipo visitante (away_goals)',
  })
  a: number

  @ApiProperty({
    type: Number,
    nullable: true,
    example: null,
    description: 'Goles de penal del local si define por penales',
  })
  hp: number | null

  @ApiProperty({
    type: Number,
    nullable: true,
    example: null,
    description: 'Goles de penal del visitante si define por penales',
  })
  ap: number | null

  @ApiProperty({ example: '5076d249-b276-496d-a4cc-611b5b9e149b' })
  homeTeamId: string

  @ApiProperty({ example: '15711355-b37a-4a65-a6a8-9bfd5a5ad9e5' })
  awayTeamId: string

  @ApiProperty({
    example: '1H',
    description:
      'Estado en tiempo real: 1H (Primer Tiempo), 2H (Segundo Tiempo), HT (Entretiempo)',
  })
  status: string

  @ApiProperty({ example: true })
  isLive: boolean

  @ApiProperty({
    example: false,
    description: 'Indica si pertenece a una instancia de eliminación directa',
  })
  isPlayoff: boolean
}
