import { ApiProperty } from '@nestjs/swagger'
import { MatchFixtureDto } from './fixture-matchday.dto'

export class CompetitionMatchesResponseDto {
  @ApiProperty({ example: 1 })
  page: number

  @ApiProperty({ example: 50 })
  pageSize: number

  @ApiProperty({ example: 15, description: 'Partidos que cumplen el filtro' })
  total: number

  @ApiProperty({ type: [MatchFixtureDto] })
  matches: MatchFixtureDto[]
}
