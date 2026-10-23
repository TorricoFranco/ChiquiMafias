import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common'
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { Public } from 'src/auth/decorators/auth.decorator'
import { FixtureService } from 'src/fixture/fixture.service'
import { CompetitionMatchesResponseDto } from 'src/fixture/dto/response/competition-matches.dto'
import { GetLiveScoresResponseDto } from 'src/fixture/dto/response/live-score.dto'
import { StandingsService } from 'src/standings/standings.service'
import { FullStandingsResponseDto } from 'src/standings/dto/response/full-standings.dto'
import { CompetitionsService } from './competitions.service'
import { BracketService } from 'src/bracket/bracket.service'
import { BracketResponseDto } from 'src/bracket/dto/bracket-response.dto'
import { CompetitionResponseDto } from './dto/competition-response.dto'
import { CompetitionMatchesQueryDto } from './dto/competition-matches-query.dto'

/**
 * Datos públicos por competición. Solo la temporada actual (ERS RF-A04): el
 * slug se valida contra la base antes de consultar o cachear (RNF-S01).
 */
@ApiTags('Competitions')
@Public()
@Controller('competitions')
export class CompetitionsController {
  constructor(
    private readonly competitions: CompetitionsService,
    private readonly fixtures: FixtureService,
    private readonly standings: StandingsService,
    private readonly bracket: BracketService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Competiciones con su temporada actual',
  })
  @ApiResponse({ status: 200, type: [CompetitionResponseDto] })
  async list(): Promise<CompetitionResponseDto[]> {
    const competitions = await this.competitions.listCurrent()
    return competitions.map((c) => CompetitionResponseDto.from(c))
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Una competición y su temporada actual' })
  @ApiParam({ name: 'slug', example: 'liga-profesional' })
  @ApiResponse({ status: 200, type: CompetitionResponseDto })
  @ApiResponse({
    status: 404,
    description: 'No existe o no tiene temporada actual',
  })
  async get(@Param('slug') slug: string): Promise<CompetitionResponseDto> {
    return CompetitionResponseDto.from(
      await this.competitions.resolveCurrent(slug),
    )
  }

  @Get(':slug/matches')
  @ApiOperation({
    summary: 'Partidos de la temporada actual',
    description:
      'Paginado de a 50, con un rango de hasta 31 días. Sin filtros: de una semana atrás a dos adelante.',
  })
  @ApiParam({ name: 'slug', example: 'liga-profesional' })
  @ApiResponse({ status: 200, type: CompetitionMatchesResponseDto })
  @ApiResponse({ status: 400, description: 'Rango de fechas inválido' })
  async matches(
    @Param('slug') slug: string,
    @Query() query: CompetitionMatchesQueryDto,
  ): Promise<CompetitionMatchesResponseDto> {
    const competition = await this.competitions.resolveCurrent(slug)
    return this.fixtures.getMatches(competition, query)
  }

  @Get(':slug/live')
  @ApiOperation({ summary: 'Marcadores en vivo de la competición' })
  @ApiParam({ name: 'slug', example: 'liga-profesional' })
  @ApiResponse({ status: 200, type: [GetLiveScoresResponseDto] })
  async live(@Param('slug') slug: string): Promise<GetLiveScoresResponseDto[]> {
    const competition = await this.competitions.resolveCurrent(slug)
    return this.fixtures.getLiveLeagueScores(competition)
  }

  @Get(':slug/standings')
  @ApiOperation({ summary: 'Tabla de posiciones de la temporada actual' })
  @ApiParam({ name: 'slug', example: 'liga-profesional' })
  @ApiResponse({ status: 200, type: FullStandingsResponseDto })
  @ApiResponse({ status: 404, description: 'El formato no tiene tabla' })
  async standingsOf(
    @Param('slug') slug: string,
  ): Promise<FullStandingsResponseDto> {
    const competition = await this.competitions.resolveCurrent(slug)
    if (!competition.strategy?.mapStandingGroup) {
      throw new NotFoundException(
        'Esta competición no tiene tabla de posiciones',
      )
    }
    return this.standings.getStandings(competition)
  }

  @Get(':slug/bracket')
  @ApiOperation({
    summary: 'Cuadro de la temporada actual',
    description:
      'Todas las llaves desde la primera ronda, con los lugares por definir y los marcadores en vivo.',
  })
  @ApiParam({ name: 'slug', example: 'copa-argentina' })
  @ApiResponse({ status: 200, type: BracketResponseDto })
  @ApiResponse({ status: 404, description: 'El formato no tiene cuadro' })
  async bracketOf(@Param('slug') slug: string): Promise<BracketResponseDto> {
    const competition = await this.competitions.resolveCurrent(slug)
    if (!competition.strategy?.bracketRounds) {
      throw new NotFoundException('Esta competición no tiene cuadro')
    }
    return this.bracket.getBracket(competition)
  }
}
