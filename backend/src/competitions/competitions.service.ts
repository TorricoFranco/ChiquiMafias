import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { CompetitionFormat } from '@prisma/client'
import { PrismaService } from 'src/prisma/prisma.service'
import { CompetitionFormatStrategy } from 'src/football/formats/format-strategy'
import { getFormatStrategy } from 'src/football/formats/format-registry'
import { leagueCacheKey } from 'src/football/mappers/round'

/** La Liga Profesional: a la que apuntan las rutas viejas sin competición. */
export const LEGACY_COMPETITION_SLUG = 'liga-profesional'

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const MAX_SLUG_LENGTH = 64
// Las competiciones cambian muy de vez en cuando (alta de temporada): se leen
// de la base como mucho una vez por minuto.
const CACHE_TTL_MS = 60_000
// Si la base falla se sigue con lo último leído y se reintenta recién después
// de esto: si no, cada pedido esperaría el timeout de la base.
const RETRY_AFTER_ERROR_MS = 5_000

/** Una competición con su temporada actual: lo único que expone la API (RF-A04). */
export interface CompetitionContext {
  leagueId: string
  slug: string
  name: string
  shortName: string | null
  logoUrl: string | null
  country: string | null
  neutralVenue: boolean
  season: number
  seasonLabel: string
  format: CompetitionFormat
  /** Clave de la competición en Redis (`leagueCacheKey`): 128 para la Liga. */
  cacheKey: number | string
  /** null si el formato todavía no tiene estrategia. */
  strategy: CompetitionFormatStrategy | null
}

/**
 * Resuelve y valida la competición antes de consultar o cachear (ERS RNF-S01):
 * ningún slug, temporada o fase llega a una clave de Redis sin pasar por acá.
 */
@Injectable()
export class CompetitionsService {
  private readonly logger = new Logger(CompetitionsService.name)
  private cache: { loadedAt: number; bySlug: Map<string, CompetitionContext> } =
    { loadedAt: 0, bySlug: new Map() }
  private loading: Promise<Map<string, CompetitionContext>> | null = null

  constructor(private readonly prisma: PrismaService) {}

  /** Competiciones con temporada actual, en orden alfabético. */
  async listCurrent(): Promise<CompetitionContext[]> {
    const bySlug = await this.load()
    return [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name))
  }

  /** 404 si el slug no existe o la competición no tiene temporada actual. */
  async resolveCurrent(slug: string): Promise<CompetitionContext> {
    if (
      typeof slug !== 'string' ||
      slug.length > MAX_SLUG_LENGTH ||
      !SLUG_PATTERN.test(slug)
    ) {
      throw new NotFoundException('Competición no encontrada')
    }
    const competition = (await this.load()).get(slug)
    if (!competition) throw new NotFoundException('Competición no encontrada')
    return competition
  }

  /** La competición actual de una liga, por su uuid; null si no tiene. */
  async findCurrentByLeagueId(
    leagueId: string,
  ): Promise<CompetitionContext | null> {
    const bySlug = await this.load()
    return [...bySlug.values()].find((c) => c.leagueId === leagueId) ?? null
  }

  /** La competición cuya clave de Redis es esta (`128`, o un uuid); null si no hay. */
  async findCurrentByCacheKey(
    cacheKey: string,
  ): Promise<CompetitionContext | null> {
    const bySlug = await this.load()
    return (
      [...bySlug.values()].find((c) => String(c.cacheKey) === cacheKey) ?? null
    )
  }

  /**
   * Rutas viejas de la Liga (`/fixtures/seasons/:season/...`): la temporada
   * tiene que ser la actual y la fase, una del formato.
   */
  async resolveLegacy(
    season: string | number,
    stage?: string,
  ): Promise<{ competition: CompetitionContext; stage: string | undefined }> {
    const competition = await this.resolveCurrent(LEGACY_COMPETITION_SLUG)
    if (String(season) !== String(competition.season)) {
      throw new NotFoundException(`No hay datos de la temporada ${season}`)
    }
    return {
      competition,
      stage:
        stage === undefined ? undefined : this.validStage(competition, stage),
    }
  }

  /** La fase en mayúsculas si es del formato; 404 si no. */
  validStage(competition: CompetitionContext, stage: string): string {
    const normalized = String(stage).toUpperCase()
    if (!competition.strategy?.stages.includes(normalized)) {
      throw new NotFoundException(`La fase ${stage} no existe`)
    }
    return normalized
  }

  private async load(): Promise<Map<string, CompetitionContext>> {
    if (Date.now() - this.cache.loadedAt < CACHE_TTL_MS) {
      return this.cache.bySlug
    }
    // Una sola consulta aunque lleguen muchos pedidos juntos.
    this.loading ??= this.fetch().finally(() => {
      this.loading = null
    })
    return this.loading
  }

  private async fetch(): Promise<Map<string, CompetitionContext>> {
    try {
      const leagues = await this.prisma.leagues.findMany({
        where: { slug: { not: null }, current_season_id: { not: null } },
        include: { current_season: true },
      })

      const bySlug = new Map<string, CompetitionContext>()
      for (const league of leagues) {
        const season = league.current_season
        if (!league.slug || !season) continue
        bySlug.set(league.slug, {
          leagueId: league.id,
          slug: league.slug,
          name: league.name,
          shortName: league.short_name,
          logoUrl: league.logo_url,
          country: league.country,
          neutralVenue: league.neutral_venue,
          season: season.season,
          seasonLabel: season.label,
          format: season.format,
          cacheKey: leagueCacheKey(league),
          strategy: getFormatStrategy(season.format),
        })
      }

      this.cache = { loadedAt: Date.now(), bySlug }
      return bySlug
    } catch (error) {
      // Si la base falla se sigue con lo último que se leyó.
      this.logger.error(
        `No se pudieron leer las competiciones: ${error instanceof Error ? error.message : String(error)}`,
      )
      if (this.cache.loadedAt === 0) throw error
      this.cache.loadedAt = Date.now() - CACHE_TTL_MS + RETRY_AFTER_ERROR_MS
      return this.cache.bySlug
    }
  }
}
