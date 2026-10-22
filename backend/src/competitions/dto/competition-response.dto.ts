import { ApiProperty } from '@nestjs/swagger'
import { CompetitionFormat } from '@prisma/client'
import { CompetitionContext } from '../competitions.service'

class CompetitionSeasonDto {
  @ApiProperty({ example: 2026, description: 'Año de inicio' })
  year: number

  @ApiProperty({
    example: '2026',
    description: 'Lo que se muestra: 2026 o 2026/27',
  })
  label: string
}

export class CompetitionResponseDto {
  @ApiProperty({ example: 'liga-profesional' })
  slug: string

  @ApiProperty({ example: 'Liga Profesional Argentina' })
  name: string

  @ApiProperty({ type: String, nullable: true, example: 'Liga Profesional' })
  shortName: string | null

  @ApiProperty({ type: String, nullable: true })
  logoUrl: string | null

  @ApiProperty({ type: String, nullable: true, example: 'Argentina' })
  country: string | null

  @ApiProperty({ enum: CompetitionFormat, example: 'LIGA_DIVIDIDA' })
  format: CompetitionFormat

  @ApiProperty({
    example: false,
    description:
      'true si se juega en cancha neutral: no hay local ni visitante',
  })
  neutralVenue: boolean

  @ApiProperty({
    example: ['APERTURA', 'CLAUSURA'],
    description:
      'Fases de la temporada; vacío si el formato todavía no tiene vista',
  })
  stages: string[]

  @ApiProperty({
    example: true,
    description: 'false mientras el formato no tiene tabla de posiciones',
  })
  hasStandings: boolean

  @ApiProperty({ type: CompetitionSeasonDto, description: 'Temporada actual' })
  season: CompetitionSeasonDto

  static from(c: CompetitionContext): CompetitionResponseDto {
    return {
      slug: c.slug,
      name: c.name,
      shortName: c.shortName,
      logoUrl: c.logoUrl,
      country: c.country,
      format: c.format,
      neutralVenue: c.neutralVenue,
      stages: [...(c.strategy?.stages ?? [])],
      hasStandings: !!c.strategy?.mapStandingGroup,
      season: { year: c.season, label: c.seasonLabel },
    }
  }
}
