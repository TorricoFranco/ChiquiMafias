import { CompetitionFormat } from '@prisma/client'
import { Logger } from '@nestjs/common'
import { FootballFixture } from '../football.types'
import { ResolvedRound } from '../mappers/round'
import {
  BracketRound,
  CompetitionFormatStrategy,
  FixturesWindow,
} from './format-strategy'

/** Fase de todos los partidos de una competición de eliminación directa. */
export const ELIMINACION_STAGE = 'ELIMINACION'

/** Rondas de un cuadro de 64 equipos, de la primera a la final. */
export const KNOCKOUT_ROUNDS: readonly BracketRound[] = [
  { matches: 32, round: '32avos de final', key: '32avos' },
  { matches: 16, round: '16avos de final', key: '16avos' },
  { matches: 8, round: 'Octavos de final', key: 'octavos' },
  { matches: 4, round: 'Cuartos de final', key: 'cuartos' },
  { matches: 2, round: 'Semifinal', key: 'semifinal' },
  { matches: 1, round: 'Final', key: 'final' },
]

const logger = new Logger('EliminacionStrategy')

/**
 * Ronda de cada partido, deducida sin mirar el nombre que le da el proveedor
 * (los 32avos fueron `1st Round` en 2025 y `Round of 64` en 2026), ERS RF-B10:
 *
 * - Los partidos se agrupan por etiqueta y las etiquetas se ordenan por la
 *   fecha de su primer partido.
 * - La primera etiqueta se ubica por cantidad de partidos (32 → 32avos,
 *   16 → 16avos…), por si al proveedor le faltan las rondas iniciales.
 * - Las siguientes van en orden: cada una es la ronda que sigue a la anterior.
 *   Así una semifinal publicada a medias (un partido) no se confunde con la
 *   final, que también tiene uno.
 */
export function resolveKnockoutRounds(
  fixtures: FootballFixture[],
): ResolvedRound[] {
  const firstDate = new Map<string, number>()
  const count = new Map<string, number>()
  for (const f of fixtures) {
    const label = f.league.round || ''
    const ts = new Date(f.date).getTime()
    firstDate.set(label, Math.min(firstDate.get(label) ?? ts, ts))
    count.set(label, (count.get(label) ?? 0) + 1)
  }

  const labels = [...firstDate.keys()].sort(
    (a, b) => firstDate.get(a)! - firstDate.get(b)!,
  )

  const roundOfLabel = new Map<string, BracketRound>()
  let next = 0
  for (const [i, label] of labels.entries()) {
    let index = next
    if (i === 0) {
      const exact = KNOCKOUT_ROUNDS.findIndex(
        (r) => r.matches === count.get(label),
      )
      if (exact !== -1) index = exact
    }
    if (index >= KNOCKOUT_ROUNDS.length) {
      logger.warn(
        `Hay más rondas que las de un cuadro de 64: "${label}" queda como final`,
      )
      index = KNOCKOUT_ROUNDS.length - 1
    }
    roundOfLabel.set(label, KNOCKOUT_ROUNDS[index])
    next = index + 1
  }

  return fixtures.map((f) => {
    const knockoutRound = roundOfLabel.get(f.league.round || '')!
    return {
      round: knockoutRound.round,
      tournament: ELIMINACION_STAGE,
      matchdayKey: knockoutRound.key,
    }
  })
}

/** Copa Argentina: eliminación directa a partido único, de enero a noviembre. */
export const eliminacionStrategy: CompetitionFormatStrategy = {
  format: CompetitionFormat.ELIMINACION,
  stages: [ELIMINACION_STAGE],

  // La temporada entera: hace falta para deducir las rondas (RF-B10) y la
  // sincronización es una vez por día.
  fixturesWindow(_now: Date, season: number): FixturesWindow {
    return { from: `${season}-01-01`, to: `${season}-12-31` }
  },

  resolveRounds: resolveKnockoutRounds,

  bracketRounds: KNOCKOUT_ROUNDS,
}
