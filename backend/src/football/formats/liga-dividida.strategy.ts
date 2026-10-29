import { CompetitionFormat } from '@prisma/client'
import { Logger } from '@nestjs/common'
import { FootballFixture } from '../football.types'
import { matchdayKeyOf, ResolvedRound } from '../mappers/round'
import {
  CompetitionFormatStrategy,
  FixturesWindow,
  StandingGroup,
} from './format-strategy'
import { ROUND_MAP } from './liga-dividida.round-map'

const FROM_DAYS_AGO = 10
const DAYS_FORWARD = 7

const logger = new Logger('LigaDivididaStrategy')
// Etiquetas desconocidas ya avisadas: el fixture se sincroniza seguido.
const warnedRounds = new Set<string>()

// Fases de playoff de una etiqueta que no está en ROUND_MAP. Un playoff que
// quedara como una fecha más no aparecería en el cuadro y el front lo sumaría a
// la tabla mientras se juega. El orden importa: "Semi-finals" y "Octavos de
// final" también contienen "final".
const PLAYOFF_PATTERNS: readonly [RegExp, string][] = [
  [/round of 16|1\/8|8th|octavos/i, 'octavos'],
  [/quarter|1\/4|cuartos/i, 'cuartos'],
  [/semi/i, 'semifinal'],
  [/final/i, 'final'],
]

/**
 * Ronda de una etiqueta que no está en ROUND_MAP: una fecha numerada queda
 * igual, un playoff se reconoce por patrón y lo demás queda igual con un aviso.
 */
function unmappedRound(rawRound: string, tournament: string): string {
  const detail = rawRound.split(' - ').pop()!.trim()
  if (/^\d+$/.test(detail)) return rawRound

  const playoff = PLAYOFF_PATTERNS.find(([pattern]) => pattern.test(detail))
  if (playoff) {
    // Mismo prefijo que ROUND_MAP: el Apertura guarda sus playoffs como `Regular Season - …`.
    const prefix = tournament === 'CLAUSURA' ? 'Clausura' : 'Regular Season'
    return `${prefix} - ${playoff[1]}`
  }

  if (!warnedRounds.has(rawRound)) {
    warnedRounds.add(rawRound)
    logger.warn(
      `Ronda desconocida de la Liga: "${rawRound}". Se guarda tal cual; si es de playoff, sumala a ROUND_MAP.`,
    )
  }
  return rawRound
}

/**
 * Traduce la etiqueta de ronda del proveedor y deriva torneo y fecha.
 * Antes esta lógica estaba copiada en `FixturesSyncCron` y `LiveScoreCron`.
 */
export function resolveLigaDivididaRound(
  rawRound: string | null | undefined,
  fallback: string,
): ResolvedRound {
  const tournament = (rawRound || fallback).toUpperCase().includes('CLAUSURA')
    ? 'CLAUSURA'
    : 'APERTURA'

  const round = rawRound
    ? (ROUND_MAP[rawRound] ?? unmappedRound(rawRound, tournament))
    : fallback

  return { round, tournament, matchdayKey: matchdayKeyOf(round) }
}

export function mapLigaDivididaGroup(groupRaw: string): StandingGroup {
  const normalized = groupRaw.toLowerCase()

  let stage = ''
  let groupName: string | null = null

  if (normalized.includes('anual')) {
    stage = 'ANNUAL'
  } else if (normalized.includes('promedios')) {
    stage = 'AVERAGES'
  } else {
    if (normalized.includes('apertura')) {
      stage = 'APERTURA'
    } else if (normalized.includes('clausura')) {
      stage = 'CLAUSURA'
    } else {
      const parts = groupRaw.split(/[,–-]/)
      stage = parts[0] ? parts[0].trim().toUpperCase() : ''
    }

    if (normalized.includes('b')) {
      groupName = 'B'
    } else if (normalized.includes('a')) {
      groupName = 'A'
    }
  }

  return { stage, groupName }
}

/** Liga Profesional: Apertura y Clausura, con zonas A y B y playoffs. */
export const ligaDivididaStrategy: CompetitionFormatStrategy = {
  format: CompetitionFormat.LIGA_DIVIDIDA,
  stages: ['APERTURA', 'CLAUSURA'],

  fixturesWindow(now: Date): FixturesWindow {
    const fromDate = new Date(now)
    fromDate.setDate(now.getDate() - FROM_DAYS_AGO)

    const toDate = new Date(now)
    toDate.setDate(now.getDate() + DAYS_FORWARD)

    return {
      from: fromDate.toISOString().split('T')[0],
      to: toDate.toISOString().split('T')[0],
    }
  },

  resolveRounds(fixtures: FootballFixture[]): ResolvedRound[] {
    return fixtures.map((f) => resolveLigaDivididaRound(f.league.round, 'N/A'))
  },

  mapStandingGroup: mapLigaDivididaGroup,
}
