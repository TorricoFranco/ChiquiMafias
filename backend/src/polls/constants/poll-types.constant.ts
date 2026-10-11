import { PollType } from '@prisma/client'

/** Forma de cada opción guardada en `Poll.options` (Json). */
export interface PollOptionShape {
  id: number
  label: string
  /** `api_team_id` como string, misma convención que `Market.metadata.*.logoUrl` en bets. */
  teamId?: string
}

/** Layouts del tipo MATCH. */
export const MATCH_LAYOUTS = ['VS', 'LIST'] as const
export type MatchLayout = (typeof MATCH_LAYOUTS)[number]

/** Configuración específica por tipo, guardada en `Poll.config` (Json). */
export interface PollConfigShape {
  layout?: MatchLayout
  picks?: number
  scale?: number
}

export interface PollTypeRule {
  /** Un tipo deshabilitado no se puede proponer ni crear todavía. */
  enabled: boolean
  /** Si acepta votos. */
  votable: boolean
  /** Cantidad de opciones que manda el creador (0 si las genera el backend). */
  minOptions: number
  maxOptions: number
  /** Opciones fijas que genera el backend; si están, el creador no manda opciones. */
  generatedOptions?: PollOptionShape[]
  /** Si las opciones pueden llevar escudo. */
  allowsTeamBadges: boolean
  /** Si cada opción exige escudo. */
  requiresTeamBadges: boolean
  /** Solo moderador o superior puede crearlo. */
  adminOnly: boolean
  /** Si exige fecha de cierre. */
  requiresEndsAt: boolean
  /** Tickets de encuesta que consume proponerla. */
  ticketCost: number
}

export const RATING_SCALE = 5
export const RANKING_PICKS = 3
export const DRAW_OPTION_LABEL = 'Empate'

const RATING_OPTIONS: PollOptionShape[] = Array.from(
  { length: RATING_SCALE },
  (_, index) => ({ id: index + 1, label: String(index + 1) }),
)

const FACTO_OPTIONS: PollOptionShape[] = [
  { id: 1, label: 'Facto' },
  { id: 2, label: 'No facto' },
]

export const POLL_TYPE_RULES: Record<PollType, PollTypeRule> = {
  CLASSIC: {
    enabled: true,
    votable: true,
    minOptions: 2,
    maxOptions: 6,
    allowsTeamBadges: false,
    requiresTeamBadges: false,
    adminOnly: false,
    requiresEndsAt: true,
    ticketCost: 1,
  },
  VERSUS: {
    enabled: true,
    votable: true,
    minOptions: 2,
    maxOptions: 2,
    allowsTeamBadges: true,
    requiresTeamBadges: false,
    adminOnly: false,
    requiresEndsAt: true,
    ticketCost: 1,
  },
  MATCH: {
    // Los límites reales dependen del layout, ver MATCH_LAYOUT_RULES.
    enabled: true,
    votable: true,
    minOptions: 2,
    maxOptions: 6,
    allowsTeamBadges: true,
    requiresTeamBadges: false,
    adminOnly: false,
    requiresEndsAt: true,
    ticketCost: 2,
  },
  RATING: {
    enabled: false,
    votable: true,
    minOptions: 0,
    maxOptions: 0,
    generatedOptions: RATING_OPTIONS,
    allowsTeamBadges: false,
    requiresTeamBadges: false,
    adminOnly: false,
    requiresEndsAt: true,
    ticketCost: 1,
  },
  RANKING: {
    enabled: false,
    votable: true,
    minOptions: 3,
    maxOptions: 6,
    allowsTeamBadges: true,
    requiresTeamBadges: false,
    adminOnly: false,
    requiresEndsAt: true,
    ticketCost: 3,
  },
  FACTO: {
    enabled: true,
    votable: true,
    minOptions: 0,
    maxOptions: 0,
    generatedOptions: FACTO_OPTIONS,
    allowsTeamBadges: false,
    requiresTeamBadges: false,
    adminOnly: false,
    requiresEndsAt: true,
    ticketCost: 1,
  },
  NEWS: {
    enabled: true,
    votable: true,
    minOptions: 2,
    maxOptions: 6,
    allowsTeamBadges: false,
    requiresTeamBadges: false,
    adminOnly: true,
    requiresEndsAt: false,
    ticketCost: 1,
  },
  INFO: {
    enabled: true,
    votable: false,
    minOptions: 0,
    maxOptions: 0,
    generatedOptions: [],
    allowsTeamBadges: false,
    requiresTeamBadges: false,
    adminOnly: true,
    requiresEndsAt: false,
    ticketCost: 1,
  },
}

/**
 * MATCH tiene dos formatos: la tarjeta de partido (el creador manda los 2 equipos
 * y el backend inserta el empate) y la pregunta con un escudo por opción.
 */
export const MATCH_LAYOUT_RULES: Record<
  MatchLayout,
  Pick<PollTypeRule, 'minOptions' | 'maxOptions' | 'requiresTeamBadges'>
> = {
  VS: { minOptions: 2, maxOptions: 2, requiresTeamBadges: true },
  LIST: { minOptions: 2, maxOptions: 6, requiresTeamBadges: false },
}

/** Nombres legibles para los mensajes de error. */
export const POLL_TYPE_LABELS: Record<PollType, string> = {
  CLASSIC: 'clásica',
  VERSUS: 'duelo',
  MATCH: 'predicción de partido',
  RATING: 'puntuación',
  RANKING: 'ranking',
  FACTO: 'facto o no facto',
  NEWS: 'noticia',
  INFO: 'informativa',
}
