import { PollType } from '@prisma/client'
import { matchdayKeyOf } from 'src/football/mappers/round'
import {
  MATCH_REVIEW_CATEGORIES,
  MATCH_REVIEW_QUESTIONS,
} from '../constants/match-polls.constant'
import type {
  PollConfigShape,
  PollOptionShape,
} from '../constants/poll-types.constant'
import { buildPollShape } from './poll-shape.util'

/** Lo que las encuestas de un partido terminado necesitan saber de él. */
export interface FinishedMatchForPolls {
  /** `APERTURA`, `CLAUSURA` o `ELIMINACION`, como se guarda en `Matches.tournament`. */
  tournament: string
  /** Ronda ya traducida, como se guarda en `Matches.round` (`Clausura - 5`). */
  round: string
  home_goals: number | null
  away_goals: number | null
  home_penalty_goals: number | null
  away_penalty_goals: number | null
  home_team: { name: string }
  away_team: { name: string }
  league: { name: string; short_name: string | null }
}

/** Una encuesta lista para guardar, todavía sin fechas ni vínculo con el partido. */
export interface MatchPollDraft {
  title: string
  description: string
  type: PollType
  options: PollOptionShape[]
  config: PollConfigShape | null
}

const TOURNAMENT_LABELS: Record<string, string> = {
  APERTURA: 'Apertura',
  CLAUSURA: 'Clausura',
}

/** Claves de `matchdayKeyOf` de los playoffs de la Liga. */
const PLAYOFF_LABELS: Record<string, string> = {
  octavos: 'Octavos de final',
  cuartos: 'Cuartos de final',
  semifinal: 'Semifinal',
  final: 'Final',
}

/**
 * Nombre del árbitro para mostrar. API-Football lo manda como "Nombre, País":
 * se queda con el nombre. Null si no hay nada que mostrar.
 */
export function refereeDisplayName(
  raw: string | null | undefined,
): string | null {
  const name = (raw ?? '').split(',')[0].replace(/\s+/g, ' ').trim()

  return name || null
}

/**
 * La fecha del partido como la dice la gente: "Fecha 5 Clausura" o "Cuartos de
 * final Apertura". En una competición de eliminación directa, la ronda con el
 * nombre de la competición ("Octavos de final Copa Argentina").
 */
export function describeMatchRound(
  match: Pick<FinishedMatchForPolls, 'tournament' | 'round' | 'league'>,
): string {
  const stage = TOURNAMENT_LABELS[match.tournament]

  if (!stage) {
    return `${match.round} ${match.league.short_name ?? match.league.name}`
  }

  const key = matchdayKeyOf(match.round)
  const matchday = key.startsWith('fecha:') ? key.slice('fecha:'.length) : ''
  if (matchday) return `Fecha ${matchday} ${stage}`

  const playoff = PLAYOFF_LABELS[key]

  return playoff ? `${playoff} ${stage}` : match.round
}

/** Descripción que se ve en el feed: `Boca 2-1 River (pen. 4-3) · Fecha 5 Clausura`. */
function describeMatch(
  match: FinishedMatchForPolls,
  roundLabel: string,
): string {
  const home = match.home_team.name
  const away = match.away_team.name
  const {
    home_goals: homeGoals,
    away_goals: awayGoals,
    home_penalty_goals: homePenalties,
    away_penalty_goals: awayPenalties,
  } = match

  const versus =
    homeGoals !== null && awayGoals !== null
      ? `${home} ${homeGoals}-${awayGoals} ${away}`
      : `${home} vs ${away}`
  const penalties =
    homePenalties !== null && awayPenalties !== null
      ? ` (pen. ${homePenalties}-${awayPenalties})`
      : ''

  return `${versus}${penalties} · ${roundLabel}`
}

/** `random` devuelve un número en [0, 1), como `Math.random`. */
function pickOne<T>(items: readonly T[], random: () => number): T {
  return items[Math.min(Math.floor(random() * items.length), items.length - 1)]
}

/** Puntuación de 1 a 5 estrellas del árbitro de un partido terminado. */
export function buildRefereePoll(
  match: FinishedMatchForPolls,
  referee: string,
): MatchPollDraft {
  const roundLabel = describeMatchRound(match)
  const { options, config } = buildPollShape({
    type: PollType.RATING,
    labels: [],
  })

  return {
    title: `¿Cómo viste el arbitraje de ${referee} en ${match.home_team.name} vs ${match.away_team.name} (${roundLabel})?`,
    description: describeMatch(match, roundLabel),
    type: PollType.RATING,
    options,
    config,
  }
}

/**
 * "¿Qué te pareció el partido?". La pregunta y la frase de cada respuesta salen
 * de los bancos y cambian de un partido a otro, pero las cuatro categorías son
 * siempre las mismas y van en el mismo orden (el id de la opción es la
 * categoría), así los resultados se pueden comparar entre partidos.
 */
export function buildMatchReviewPoll(
  match: FinishedMatchForPolls,
  random: () => number = Math.random,
): MatchPollDraft {
  const roundLabel = describeMatchRound(match)
  const question = pickOne(MATCH_REVIEW_QUESTIONS, random)
  const labels = MATCH_REVIEW_CATEGORIES.map((category) =>
    pickOne(category.phrases, random),
  )
  // buildPollShape numera las opciones desde 1 en el orden de las etiquetas, que
  // es el de las categorías.
  const { options, config } = buildPollShape({
    type: PollType.CLASSIC,
    labels,
  })

  return {
    title: `${question} (${match.home_team.name} vs ${match.away_team.name})`,
    description: describeMatch(match, roundLabel),
    type: PollType.CLASSIC,
    options,
    config,
  }
}
