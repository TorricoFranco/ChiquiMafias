import { CompetitionFormat } from '@prisma/client'
import { FootballFixture } from '../football.types'
import { ResolvedRound } from '../mappers/round'

/** Rango de fechas a pedirle al proveedor (YYYY-MM-DD, ambas inclusive). */
export interface FixturesWindow {
  from: string
  to: string
}

/** Fase y grupo de una fila de la tabla (`TeamSeasonStats`). */
export interface StandingGroup {
  stage: string
  groupName: string | null
}

/**
 * Lo que cambia según el formato de una competición (ERS RF-A08). Los crons
 * no saben de Apertura, Clausura ni llaves: le preguntan a la estrategia.
 * Un formato nuevo es un archivo nuevo registrado en `format-registry.ts`.
 */
export interface CompetitionFormatStrategy {
  readonly format: CompetitionFormat

  /** Fases de la temporada, como se guardan en `Matches.tournament`. */
  readonly stages: readonly string[]

  /** Qué partidos traer en cada sincronización del fixture. */
  fixturesWindow(now: Date): FixturesWindow

  /**
   * Ronda de cada partido, en el mismo orden. Recibe todos los partidos
   * juntos porque hay formatos que deducen la ronda mirando la temporada
   * entera (en la Copa, por la cantidad de partidos de cada fecha).
   */
  resolveRounds(fixtures: FootballFixture[]): ResolvedRound[]

  /** Fase y grupo de una fila de la tabla. Sin este método no hay tabla. */
  mapStandingGroup?(rawGroup: string): StandingGroup
}
