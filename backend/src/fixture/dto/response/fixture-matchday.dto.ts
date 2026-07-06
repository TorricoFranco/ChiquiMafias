import { ApiProperty } from '@nestjs/swagger'

class TeamFixtureDetailDto {
  @ApiProperty({ example: 'Belgrano Cordoba' })
  name: string

  @ApiProperty({
    example: 'https://media.api-sports.io/football/teams/440.png',
  })
  logo_url: string
}

export class MatchFixtureDto {
  @ApiProperty({ example: '03adeb55-8d7a-4947-9333-8366de4a1517' })
  id: string

  @ApiProperty({ example: '2026-05-12T22:00:00.000Z' })
  date: string

  @ApiProperty({ type: Number, nullable: true, example: 2 })
  home_goals: number | null

  @ApiProperty({ type: Number, nullable: true, example: 0 })
  away_goals: number | null

  @ApiProperty({ type: Number, nullable: true, example: null })
  home_penalty_goals: number | null

  @ApiProperty({ type: Number, nullable: true, example: null })
  away_penalty_goals: number | null

  @ApiProperty({
    example: 'FT',
    description:
      'Estados: NS (No empezado), FT (Finalizado), AET (Finalizado en prórroga), 1H/2H (En vivo)',
  })
  status_short: string

  @ApiProperty({ example: 90 })
  elapsed: number

  @ApiProperty({ example: false })
  is_live: boolean

  @ApiProperty({
    example: true,
    description: 'True si pertenece a fases de eliminación directa',
  })
  is_playoff: boolean

  @ApiProperty({ example: 'Regular Season - cuartos' })
  round: string

  @ApiProperty({ type: TeamFixtureDetailDto })
  home_team: TeamFixtureDetailDto

  @ApiProperty({ type: TeamFixtureDetailDto })
  away_team: TeamFixtureDetailDto

  @ApiProperty({ example: '5076d249-b276-496d-a4cc-611b5b9e149b' })
  home_team_id: string

  @ApiProperty({ example: '15711355-b37a-4a65-a6a8-9bfd5a5ad9e5' })
  away_team_id: string
}

export class GetFixtureMatchdayResponseDto {
  @ApiProperty({ example: 'APERTURA', enum: ['APERTURA', 'CLAUSURA'] })
  tournament: string

  @ApiProperty({ example: '2026' })
  season: string

  @ApiProperty({
    example: 'cuartos',
    description:
      'Puede ser un número de fecha ("4") o fase de playoff ("cuartos")',
  })
  current_matchday: string

  @ApiProperty({ type: MatchFixtureDto, isArray: true })
  matches: MatchFixtureDto[]
}
