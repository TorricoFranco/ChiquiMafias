import { ApiProperty } from '@nestjs/swagger'

//  HISTORIAL (H2H)

class VenueDto {
  @ApiProperty({ example: 'Estadio Julio Cesar Villagra' })
  name: string

  @ApiProperty({ example: 'Cordoba' })
  city: string
}

class FixtureDto {
  @ApiProperty({ example: 1491940 })
  id: number

  @ApiProperty({ example: '2026-05-03T19:00:00+00:00' })
  date: string

  @ApiProperty({ type: VenueDto })
  venue: VenueDto

  @ApiProperty({ example: 'FT' })
  status: { short: string }
}

class TeamInfoDetailDto {
  @ApiProperty({ example: 440 })
  id: number

  @ApiProperty({ example: 'Belgrano Cordoba' })
  name: string

  @ApiProperty({
    example: 'https://media.api-sports.io/football/teams/440.png',
  })
  logo: string
}

class TeamsH2HDto {
  @ApiProperty({ type: TeamInfoDetailDto })
  home: TeamInfoDetailDto

  @ApiProperty({ type: TeamInfoDetailDto })
  away: TeamInfoDetailDto
}

class LastMatchDto {
  @ApiProperty({ type: FixtureDto })
  fixture: FixtureDto

  @ApiProperty({ type: TeamsH2HDto })
  teams: TeamsH2HDto

  @ApiProperty({ example: { home: 4, away: 0 } })
  goals: { home: number; away: number }
}

class HistoryDto {
  @ApiProperty({ example: 2 })
  homeWins: number

  @ApiProperty({ example: 0 })
  awayWins: number

  @ApiProperty({ example: 3 })
  draws: number

  @ApiProperty({ example: 5 })
  total: number

  @ApiProperty({ type: LastMatchDto, isArray: true })
  lastMatches: LastMatchDto[]
}

// RACHA / FORMA

class FormDto {
  @ApiProperty({
    example: 'GGGPE',
    description: 'Últimos 5 partidos (G: Ganado, E: Empatado, P: Perdido)',
  })
  home: string

  @ApiProperty({ example: 'PGPPG' })
  away: string
}

// ==========================================
// TABLAS RECORTADAS
// ==========================================
class MiniTableEntryDto {
  @ApiProperty({
    example: 5,
    description: 'Posición en la tabla de posiciones',
  })
  rank: number

  @ApiProperty({ example: 440 })
  teamId: number

  @ApiProperty({ example: 'Belgrano Cordoba' })
  name: string

  @ApiProperty({
    example: 'https://media.api-sports.io/football/teams/440.png',
  })
  logo: string

  @ApiProperty({ example: 26 })
  points: number

  @ApiProperty({ example: 16 })
  played: number

  @ApiProperty({ example: 4 })
  goalsDiff: number

  @ApiProperty({
    example: true,
    description: 'Indica si este equipo es participante del partido actual',
  })
  isTarget: boolean
}

class MiniTableSectionsDto {
  @ApiProperty({ type: MiniTableEntryDto, isArray: true })
  home: MiniTableEntryDto[]

  @ApiProperty({ type: MiniTableEntryDto, isArray: true })
  away: MiniTableEntryDto[]
}

class MiniTableDto {
  @ApiProperty({
    type: MiniTableSectionsDto,
    description: 'Tabla recortada del torneo actual (Apertura/Clausura)',
  })
  tournament: MiniTableSectionsDto

  @ApiProperty({
    type: MiniTableSectionsDto,
    description: 'Tabla acumulada anual (Copas/Descenso)',
  })
  annual: MiniTableSectionsDto

  @ApiProperty({
    type: MiniTableSectionsDto,
    description: 'Tabla de promedios del descenso',
  })
  averages: MiniTableSectionsDto
}

export class PreMatchResponseDto {
  @ApiProperty({ type: HistoryDto })
  history: HistoryDto

  @ApiProperty({ type: FormDto })
  form: FormDto

  @ApiProperty({ type: MiniTableDto })
  miniTable: MiniTableDto
}
