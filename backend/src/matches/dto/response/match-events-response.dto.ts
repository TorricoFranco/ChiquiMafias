import { ApiProperty } from '@nestjs/swagger'

class TeamEventDto {
  @ApiProperty({ example: '8cabf7f1-4266-4d7e-9595-927bd4dc15fd' })
  id: string

  @ApiProperty({ example: 'Defensa Y Justicia' })
  name: string

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'https://media.api-sports.io/football/teams/442.png',
  })
  logo_url: string | null // <-- Clave: Permitir null
}

class PlayerEventDto {
  @ApiProperty({ example: '5f193d26-057f-4e41-9279-70c186d3b072' })
  id: string

  @ApiProperty({ example: 'J. B. Miritello' })
  name: string

  @ApiProperty({ type: String, nullable: true, example: null })
  photo: string | null
}

class SubstitutionLogDto {
  @ApiProperty({ example: 'Martín Luciano' })
  playerIn: string

  @ApiProperty({ example: 'J. Russo' })
  playerOut: string
}

export class MatchEventResponseDto {
  @ApiProperty({ example: '1ae21120-3417-4f27-b049-f46c70f5ef2e' })
  id: string

  @ApiProperty({ example: 45 })
  minute: number

  @ApiProperty({ type: Number, nullable: true, example: null })
  extraMinute: number | null

  @ApiProperty({
    example: 'Goal',
    description: 'Tipos: Goal, Card, subst, etc.',
  })
  type: string

  @ApiProperty({
    example: 'Normal Goal',
    description: 'Detalle: Yellow Card, Substitution 1, etc.',
  })
  detail: string

  @ApiProperty({ type: TeamEventDto, nullable: true })
  team: TeamEventDto | null

  @ApiProperty({ type: PlayerEventDto, nullable: true })
  player: PlayerEventDto | null

  @ApiProperty({ type: PlayerEventDto, nullable: true })
  assist: PlayerEventDto | null

  @ApiProperty({ type: SubstitutionLogDto, nullable: true })
  substitutionLog: SubstitutionLogDto | null
}
