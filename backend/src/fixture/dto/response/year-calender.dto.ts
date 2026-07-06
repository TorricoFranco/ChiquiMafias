import { ApiProperty } from '@nestjs/swagger'
import { MatchFixtureDto } from './fixture-matchday.dto'

export class GetYearlyCalendarResponseDto {
  @ApiProperty({ example: '2026' })
  season: string

  @ApiProperty({
    type: String,
    isArray: true,
    example: ['2026-01-22', '2026-01-23', '2026-01-24'],
    description:
      'Lista ordenada de días del año que contienen al menos un partido',
  })
  availableDays: string[]

  @ApiProperty({
    type: 'object',
    additionalProperties: {
      type: 'array',
      items: { $ref: '#/components/schemas/MatchFixtureDto' },
    },
    example: {
      '2026-01-22': [
        {
          id: 'c89e7ae7-522b-476b-96e2-df86fe62ee3d',
          date: '2026-01-22T20:00:00.000Z',
          home_goals: 0,
          away_goals: 0,
          home_penalty_goals: null,
          away_penalty_goals: null,
          status_short: 'FT',
          elapsed: 90,
          is_live: false,
          is_playoff: false,
          round: 'Apertura - 1',
          home_team: { name: 'Aldosivi', logo_url: '...' },
          away_team: { name: 'Defensa Y Justicia', logo_url: '...' },
          home_team_id: 'a0dc2ec9-8a0c-46f8-9bfa-a62b85b0e8c1',
          away_team_id: '8cabf7f1-4266-4d7e-9595-927bd4dc15fd',
        },
      ],
    },
    description:
      'Diccionario indexado por fechas locales (YYYY-MM-DD) conteniendo los partidos de ese día.',
  })
  calendar: Record<string, MatchFixtureDto[]>
}
