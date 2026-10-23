import { ApiProperty } from '@nestjs/swagger'

export class BracketTeamDto {
  @ApiProperty() id: string
  @ApiProperty({ example: 'River Plate' }) name: string
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Escudo en Cloudinary (equipos sin ID de API-Football)',
  })
  logoUrl: string | null
  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Con ID, el front usa el escudo local /escudos-api/<id>.webp',
  })
  apiTeamId: number | null
}

export class BracketSlotDto {
  @ApiProperty({
    example: 1,
    description: 'Lugar en la ronda, de arriba hacia abajo',
  })
  position: number

  @ApiProperty({ type: String, nullable: true }) matchId: string | null
  @ApiProperty({ type: Date, nullable: true }) date: Date | null
  @ApiProperty({ type: String, nullable: true, example: 'PEN' })
  status: string | null
  @ApiProperty({ example: false }) isLive: boolean

  @ApiProperty({ type: Number, nullable: true }) homeGoals: number | null
  @ApiProperty({ type: Number, nullable: true }) awayGoals: number | null
  @ApiProperty({ type: Number, nullable: true }) homePenalties: number | null
  @ApiProperty({ type: Number, nullable: true }) awayPenalties: number | null

  @ApiProperty({
    type: BracketTeamDto,
    nullable: true,
    description: 'Null mientras el lugar está por definir',
  })
  home: BracketTeamDto | null

  @ApiProperty({ type: BracketTeamDto, nullable: true })
  away: BracketTeamDto | null

  @ApiProperty({ type: String, nullable: true }) winnerTeamId: string | null
}

export class BracketRoundDto {
  @ApiProperty({ example: 1, description: '1 = primera ronda … final' })
  order: number
  @ApiProperty({ example: '32avos' }) key: string
  @ApiProperty({ example: '32avos de final' }) name: string
  @ApiProperty({ type: [BracketSlotDto] }) slots: BracketSlotDto[]
}

export class BracketResponseDto {
  @ApiProperty({ type: [BracketRoundDto] }) rounds: BracketRoundDto[]
}
