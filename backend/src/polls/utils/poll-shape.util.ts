import { BadRequestException } from '@nestjs/common'
import { PollType } from '@prisma/client'
import {
  DRAW_OPTION_LABEL,
  MATCH_LAYOUT_RULES,
  MatchLayout,
  POLL_TYPE_LABELS,
  POLL_TYPE_RULES,
  PollConfigShape,
  PollOptionShape,
  RANKING_PICKS,
  RATING_SCALE,
} from '../constants/poll-types.constant'

const MAX_LABEL_LENGTH = 60
const TEAM_ID_PATTERN = /^\d+$/

export interface BuildPollShapeInput {
  type: PollType
  /** Etiquetas que escribió el creador (vacío en los tipos de opciones fijas). */
  labels: string[]
  /** Escudos alineados por índice con `labels`; vacío o `undefined` = sin escudo. */
  teamIds?: (string | null | undefined)[]
  /** Formato del tipo MATCH. */
  layout?: MatchLayout
}

export interface PollShape {
  options: PollOptionShape[]
  config: PollConfigShape | null
  ticketCost: number
  requiresEndsAt: boolean
}

/**
 * Valida y normaliza las opciones, la config y el costo de una encuesta según su tipo.
 * La usan tanto `proposePoll` (usuario) como `createPoll` (moderador).
 */
export function buildPollShape(input: BuildPollShapeInput): PollShape {
  const { type } = input
  const rule = POLL_TYPE_RULES[type]

  if (!rule) {
    throw new BadRequestException('Tipo de encuesta desconocido')
  }

  if (!rule.enabled) {
    throw new BadRequestException(
      `Las encuestas de tipo ${POLL_TYPE_LABELS[type]} todavía no están disponibles`,
    )
  }

  const labels = (input.labels ?? []).map((label) => (label ?? '').trim())
  const teamIds = normalizeTeamIds(input.teamIds, labels.length)

  if (rule.generatedOptions) {
    if (labels.length > 0) {
      throw new BadRequestException(
        rule.votable
          ? `Las opciones de una encuesta ${POLL_TYPE_LABELS[type]} son fijas: no las mandes`
          : `Una encuesta ${POLL_TYPE_LABELS[type]} no lleva opciones`,
      )
    }

    return {
      options: rule.generatedOptions.map((option) => ({ ...option })),
      config: buildConfig(type),
      ticketCost: rule.ticketCost,
      requiresEndsAt: rule.requiresEndsAt,
    }
  }

  const layout = type === 'MATCH' ? resolveMatchLayout(input.layout) : undefined
  const limits =
    layout !== undefined
      ? MATCH_LAYOUT_RULES[layout]
      : {
          minOptions: rule.minOptions,
          maxOptions: rule.maxOptions,
          requiresTeamBadges: rule.requiresTeamBadges,
        }

  assertOptionCount(type, labels.length, limits.minOptions, limits.maxOptions)
  assertLabels(labels)
  assertTeamIds(type, teamIds, rule.allowsTeamBadges, limits.requiresTeamBadges)

  const options =
    layout === 'VS'
      ? buildVersusMatchOptions(labels, teamIds)
      : labels.map((label, index) =>
          buildOption(index + 1, label, teamIds[index]),
        )

  return {
    options,
    config: buildConfig(type, layout),
    ticketCost: resolveTicketCost(type, options),
    requiresEndsAt: rule.requiresEndsAt,
  }
}

/** Tickets que consume proponer la encuesta. Un duelo con escudos cuesta más que uno de texto. */
export function resolveTicketCost(
  type: PollType,
  options: PollOptionShape[],
): number {
  const base = POLL_TYPE_RULES[type].ticketCost

  if (type === 'VERSUS') {
    return options.some((option) => option.teamId) ? 2 : base
  }

  return base
}

/** Lee `Poll.options` (Json) como el array tipado que el resto del módulo espera. */
export function parsePollOptions(options: unknown): PollOptionShape[] {
  if (!Array.isArray(options)) return []

  return options as PollOptionShape[]
}

/** Lee `Poll.config` (Json). */
export function parsePollConfig(config: unknown): PollConfigShape {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return {}

  return config
}

function buildOption(
  id: number,
  label: string,
  teamId?: string,
): PollOptionShape {
  return teamId ? { id, label, teamId } : { id, label }
}

/** La tarjeta de partido: el creador manda los dos equipos y el empate lo pone el backend. */
function buildVersusMatchOptions(
  labels: string[],
  teamIds: (string | undefined)[],
): PollOptionShape[] {
  return [
    buildOption(1, labels[0], teamIds[0]),
    buildOption(2, DRAW_OPTION_LABEL),
    buildOption(3, labels[1], teamIds[1]),
  ]
}

function buildConfig(
  type: PollType,
  layout?: MatchLayout,
): PollConfigShape | null {
  if (type === 'MATCH') return { layout: layout ?? 'VS' }
  if (type === 'RATING') return { scale: RATING_SCALE }
  if (type === 'RANKING') return { picks: RANKING_PICKS }

  return null
}

function resolveMatchLayout(layout?: MatchLayout): MatchLayout {
  if (!layout) {
    throw new BadRequestException(
      'Elegí el formato de la predicción: tarjeta de partido (VS) o pregunta con escudos (LIST)',
    )
  }

  return layout
}

function normalizeTeamIds(
  teamIds: (string | null | undefined)[] | undefined,
  length: number,
): (string | undefined)[] {
  return Array.from({ length }, (_, index) => {
    const teamId = teamIds?.[index]

    return teamId ? teamId.trim() || undefined : undefined
  })
}

function assertOptionCount(
  type: PollType,
  count: number,
  min: number,
  max: number,
): void {
  if (count >= min && count <= max) return

  if (max === 0) {
    throw new BadRequestException(
      `Una encuesta ${POLL_TYPE_LABELS[type]} no lleva opciones`,
    )
  }

  if (min === max) {
    throw new BadRequestException(
      `Una encuesta ${POLL_TYPE_LABELS[type]} lleva exactamente ${min} opciones`,
    )
  }

  throw new BadRequestException(
    count < min
      ? `Una encuesta ${POLL_TYPE_LABELS[type]} lleva al menos ${min} opciones`
      : `Una encuesta ${POLL_TYPE_LABELS[type]} admite hasta ${max} opciones`,
  )
}

function assertLabels(labels: string[]): void {
  labels.forEach((label, index) => {
    if (!label) {
      throw new BadRequestException(`La opción ${index + 1} está vacía`)
    }

    if (label.length > MAX_LABEL_LENGTH) {
      throw new BadRequestException(
        `La opción ${index + 1} no puede superar los ${MAX_LABEL_LENGTH} caracteres`,
      )
    }
  })

  const unique = new Set(labels.map((label) => label.toLowerCase()))

  if (unique.size !== labels.length) {
    throw new BadRequestException('Las opciones no pueden repetirse')
  }
}

function assertTeamIds(
  type: PollType,
  teamIds: (string | undefined)[],
  allowsTeamBadges: boolean,
  requiresTeamBadges: boolean,
): void {
  const used = teamIds.filter((teamId): teamId is string => Boolean(teamId))

  if (!allowsTeamBadges && used.length > 0) {
    throw new BadRequestException(
      `Una encuesta ${POLL_TYPE_LABELS[type]} no lleva escudos`,
    )
  }

  if (requiresTeamBadges && used.length !== teamIds.length) {
    throw new BadRequestException('Elegí el escudo de cada equipo')
  }

  used.forEach((teamId) => {
    if (!TEAM_ID_PATTERN.test(teamId)) {
      throw new BadRequestException('Escudo inválido')
    }
  })

  if (new Set(used).size !== used.length) {
    throw new BadRequestException('No podés usar el mismo escudo dos veces')
  }
}

/** Tickets cobrados por ítem de inventario, para devolver exactamente los mismos. */
export interface PollTicketRefund {
  itemId: string
  quantity: number
}

/** Lee `Poll.ticketRefund` (Json) descartando cualquier forma inesperada. */
export function parseTicketRefund(value: unknown): PollTicketRefund[] {
  if (!Array.isArray(value)) return []

  return value.filter(
    (entry): entry is PollTicketRefund =>
      Boolean(entry) &&
      typeof entry === 'object' &&
      typeof (entry as PollTicketRefund).itemId === 'string' &&
      Number.isInteger((entry as PollTicketRefund).quantity) &&
      (entry as PollTicketRefund).quantity > 0,
  )
}
