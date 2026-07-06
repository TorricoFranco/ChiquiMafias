import { ApiProperty } from '@nestjs/swagger'

class BracketTeamDto {
  @ApiProperty({ example: 'River Plate' })
  name: string

  @ApiProperty({ example: 'https://media.api-sports.io/...', nullable: true })
  logo_url: string | null
}

class BracketMatchDto {
  @ApiProperty({ example: '5016162c-9b69-4266-ba31-36318ed82de5' })
  id: string

  @ApiProperty({ example: '2026-05-16T22:30:00.000Z', nullable: true })
  date: string | null

  @ApiProperty({ example: 'NS' })
  status_short: string

  @ApiProperty({ example: 'Regular Season - semifinal' })
  round: string

  @ApiProperty({ example: 0, nullable: true })
  home_goals: number | null

  @ApiProperty({ example: 0, nullable: true })
  away_goals: number | null

  @ApiProperty({ example: null, nullable: true })
  home_penalty_goals: number | null

  @ApiProperty({ example: null, nullable: true })
  away_penalty_goals: number | null

  @ApiProperty({ example: false })
  is_live: boolean

  @ApiProperty({ example: true })
  is_playoff: boolean

  @ApiProperty({ type: BracketTeamDto })
  home_team: BracketTeamDto

  @ApiProperty({ type: BracketTeamDto })
  away_team: BracketTeamDto

  @ApiProperty({ example: 'left', enum: ['left', 'right', 'center'] })
  side: string

  @ApiProperty({ example: 0 })
  position: number
}

export class BracketsRoundsDto {
  @ApiProperty({ type: [BracketMatchDto] })
  octavos: BracketMatchDto[]

  @ApiProperty({ type: [BracketMatchDto] })
  cuartos: BracketMatchDto[]

  @ApiProperty({ type: [BracketMatchDto] })
  semifinal: BracketMatchDto[]

  @ApiProperty({ type: [BracketMatchDto] })
  final: BracketMatchDto[]
}

export class TournamentBracketsResponseDto {
  @ApiProperty({ example: 'apertura' })
  tournament: string

  @ApiProperty({ example: '2026' })
  season: string

  @ApiProperty({ type: BracketsRoundsDto })
  brackets: BracketsRoundsDto
}
