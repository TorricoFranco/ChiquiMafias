import { ApiProperty } from '@nestjs/swagger'

class PendingTeamDto {
  @ApiProperty({ example: '75b675f5-02b8-422e-9439-9bb1d21b8e07' })
  id: string

  @ApiProperty({ example: 'River Plate' })
  name: string

  @ApiProperty({ example: 'RIV', nullable: true })
  short_code: string | null

  @ApiProperty({
    example: 'https://media.api-sports.io/football/teams/435.png',
  })
  logo_url: string
}

class PendingMatchDto {
  @ApiProperty({ example: '5016162c-9b69-4266-ba31-36318ed82de5' })
  id: string

  @ApiProperty({ example: '2026-05-16T22:30:00.000Z' })
  date: string

  @ApiProperty({ example: 'NS' })
  status_short: string

  @ApiProperty({ example: 'APERTURA' })
  tournament: string

  @ApiProperty({ example: true })
  is_playoff: boolean

  @ApiProperty({ type: PendingTeamDto })
  home_team: PendingTeamDto

  @ApiProperty({ type: PendingTeamDto })
  away_team: PendingTeamDto
}

export class GetPendingFixturesResponseDto {
  @ApiProperty({
    example: '1',
    description:
      'Puede ser un número de fecha ("1") o el nombre de la instancia de playoff ("semifinal")',
  })
  matchday: string

  @ApiProperty({ example: false })
  is_playoff: boolean

  @ApiProperty({ type: PendingMatchDto, isArray: true })
  matches: PendingMatchDto[]
}
