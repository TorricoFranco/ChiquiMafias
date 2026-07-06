import { ApiProperty } from '@nestjs/swagger'

class StandingRowDto {
  @ApiProperty({ example: 1 })
  position: number

  @ApiProperty({ example: 'eaa19450-ca6f-4979-81b4-cd01a2cf354e' })
  teamId: string

  @ApiProperty({ example: 'Boca Juniors' })
  teamName: string

  @ApiProperty({ example: 'https://media.api-sports.io/...', nullable: true })
  teamLogo: string | null

  @ApiProperty({ example: 'https://media.api-sports.io/...', nullable: true })
  teamPhoto?: string | null

  @ApiProperty({ example: 30 })
  points: number

  @ApiProperty({ example: 16 })
  played: number

  @ApiProperty({ example: 8 })
  won: number

  @ApiProperty({ example: 6 })
  draw: number

  @ApiProperty({ example: 2 })
  lost: number

  @ApiProperty({ example: 22 })
  goalsFor: number

  @ApiProperty({ example: 9 })
  goalsAgainst: number

  @ApiProperty({ example: 13 })
  goalDiff: number

  @ApiProperty({ example: 'Playoffs', nullable: true })
  description: string | null
}

class TournamentGroupsDto {
  @ApiProperty({ type: [StandingRowDto] })
  A: StandingRowDto[]

  @ApiProperty({ type: [StandingRowDto] })
  B: StandingRowDto[]
}

class TournamentDataDto {
  @ApiProperty({ example: 'APERTURA' })
  tournament: string

  @ApiProperty({ type: TournamentGroupsDto })
  groups: TournamentGroupsDto
}

class YearlyStatsDto {
  @ApiProperty({ example: 67 })
  pts: number

  @ApiProperty({ example: 41 })
  pj: number
}

class AverageRowDto {
  @ApiProperty({ example: 'eaa19450-ca6f-4979-81b4-cd01a2cf354e' })
  teamId: string

  @ApiProperty({ example: 'Boca Juniors' })
  teamName: string

  @ApiProperty({ example: 'https://media.api-sports.io/...', nullable: true })
  teamLogo: string | null

  @ApiProperty({ example: 'Descenso directo', nullable: true })
  description: string | null

  @ApiProperty({ type: YearlyStatsDto })
  stats2024: YearlyStatsDto

  @ApiProperty({ type: YearlyStatsDto })
  stats2025: YearlyStatsDto

  @ApiProperty({ type: YearlyStatsDto })
  stats2026: YearlyStatsDto

  @ApiProperty({ example: 159 })
  totalPoints: number

  @ApiProperty({ example: 89 })
  totalPlayed: number

  @ApiProperty({ example: 1.787 })
  coefficient: number
}

export class FullStandingsResponseDto {
  @ApiProperty({ type: TournamentDataDto })
  apertura: TournamentDataDto

  @ApiProperty({ type: TournamentDataDto })
  clausura: TournamentDataDto

  @ApiProperty({ type: [StandingRowDto] })
  annual: StandingRowDto[]

  @ApiProperty({ type: [AverageRowDto] })
  averages: AverageRowDto[]

  @ApiProperty({ example: '2026-05-16T22:47:03.000Z' })
  updated_at: string
}
