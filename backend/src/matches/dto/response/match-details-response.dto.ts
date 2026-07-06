// src/matches/dto/responses/match-details-response.dto.ts
import { ApiProperty } from '@nestjs/swagger'

class VenueDto {
  @ApiProperty() name: string
  @ApiProperty({ nullable: true }) city: string | null
  @ApiProperty({ nullable: true }) image: string | null
}

class MetadataDto {
  @ApiProperty() id: string
  @ApiProperty() status: string
  @ApiProperty() status_long: string
  @ApiProperty() date: Date
  @ApiProperty() timestamp: number
  @ApiProperty({ nullable: true }) referee: string | null
  @ApiProperty() round: string
  @ApiProperty() tournament: string
  @ApiProperty({ type: VenueDto, nullable: true }) venue: VenueDto | null
}

class TeamInfoDto {
  @ApiProperty() id: string
  @ApiProperty() name: string
  @ApiProperty({ nullable: true }) logo: string | null
  @ApiProperty({ nullable: true }) short_code: string | null
}

export class TeamsDto {
  @ApiProperty({ type: TeamInfoDto }) home: TeamInfoDto
  @ApiProperty({ type: TeamInfoDto }) away: TeamInfoDto
}

class GoalEventSummaryDto {
  @ApiProperty() min: number
  @ApiProperty() player: string
  @ApiProperty() team: string
}

class ScoreSummaryDto {
  @ApiProperty({ type: [GoalEventSummaryDto] }) goals: GoalEventSummaryDto[]
  @ApiProperty({ type: [GoalEventSummaryDto] }) redCards: GoalEventSummaryDto[]
  @ApiProperty({ nullable: true }) lastUpdate?: string | null
}

export class ScoreDto {
  @ApiProperty() home: number
  @ApiProperty() away: number
  @ApiProperty({ nullable: true }) home_penalties: number | null
  @ApiProperty({ nullable: true }) away_penalties: number | null
  @ApiProperty({ nullable: true }) elapsed: number | null
  @ApiProperty({ type: ScoreSummaryDto }) summary: ScoreSummaryDto
}

class StatisticsDto {
  @ApiProperty() fouls: number
  @ApiProperty() offsides: number
  @ApiProperty() 'passes_%': string
  @ApiProperty() red_cards: number
  @ApiProperty() total_shots: number
  @ApiProperty() corner_kicks: number
  @ApiProperty() total_passes: number
  @ApiProperty() yellow_cards: number
  @ApiProperty() blocked_shots: number
  @ApiProperty() shots_on_goal: number
  @ApiProperty() expected_goals: string
  @ApiProperty() shots_off_goal: number
  @ApiProperty() ball_possession: string
  @ApiProperty() goals_prevented: string
  @ApiProperty() passes_accurate: number
  @ApiProperty() shots_insidebox: number
  @ApiProperty() goalkeeper_saves: number
  @ApiProperty() shots_outsidebox: number
}

class TeamStatsDto {
  @ApiProperty() teamId: string
  @ApiProperty() teamName: string
  @ApiProperty({ nullable: true }) teamLogo: string | null
  @ApiProperty({ type: StatisticsDto }) statistics: StatisticsDto
}

export class MatchDetailsResponseDto {
  @ApiProperty({ type: MetadataDto })
  metadata: MetadataDto

  @ApiProperty({ type: ScoreDto })
  score: ScoreDto

  @ApiProperty({ type: TeamsDto })
  teams: TeamsDto

  @ApiProperty() isLive: boolean

  @ApiProperty() chatActive: boolean

  @ApiProperty({ type: [Object] })
  events: any[]

  @ApiProperty({ type: [Object] })
  lineups: any[]

  @ApiProperty({ type: [TeamStatsDto] })
  stats: TeamStatsDto[]
}
