import { CompetitionFormat } from '@prisma/client'
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

/**
 * Traduce la etiqueta de ronda del proveedor y deriva torneo y fecha.
 * Antes esta lógica estaba copiada en `FixturesSyncCron` y `LiveScoreCron`.
 */
export function resolveLigaDivididaRound(
  rawRound: string | null | undefined,
  fallback: string,
): ResolvedRound {
  const round = (rawRound && ROUND_MAP[rawRound]) || rawRound || fallback

  const tournament = round.toUpperCase().includes('CLAUSURA')
    ? 'CLAUSURA'
    : 'APERTURA'

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
