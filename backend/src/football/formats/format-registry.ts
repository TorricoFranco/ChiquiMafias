import { CompetitionFormat } from '@prisma/client'
import { CompetitionFormatStrategy } from './format-strategy'
import { eliminacionStrategy } from './eliminacion.strategy'
import { ligaDivididaStrategy } from './liga-dividida.strategy'

const STRATEGIES: Partial<
  Record<CompetitionFormat, CompetitionFormatStrategy>
> = {
  [CompetitionFormat.LIGA_DIVIDIDA]: ligaDivididaStrategy,
  [CompetitionFormat.ELIMINACION]: eliminacionStrategy,
}

/**
 * Estrategia del formato, o null si todavía no está implementada: los crons
 * saltean esa temporada con un aviso en vez de sincronizarla mal.
 */
export function getFormatStrategy(
  format: CompetitionFormat,
): CompetitionFormatStrategy | null {
  return STRATEGIES[format] ?? null
}
