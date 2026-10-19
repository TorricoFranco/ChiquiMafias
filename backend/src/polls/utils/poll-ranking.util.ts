import { RANKING_PICKS } from '../constants/poll-types.constant'

/**
 * Veces que cada opción fue elegida en cada posición del podio.
 * La clave es el `optionId` y el array tiene una posición por lugar:
 * el índice 0 son los primeros puestos, el 1 los segundos, y así.
 */
export type RankingMatrix = Record<string, number[]>

/** Campo del hash `poll:<id>:ranking` para una opción y una posición (1-based). */
export const rankingField = (optionId: number, position: number) =>
  `${optionId}:${position}`

/**
 * Arma la matriz de posiciones a partir del hash crudo de Redis.
 * Las opciones que nadie eligió quedan en cero, así el front siempre
 * recibe la misma forma.
 */
export function buildRankingMatrix(
  raw: Record<string, string>,
  optionIds: number[],
  picks: number = RANKING_PICKS,
): RankingMatrix {
  const matrix: RankingMatrix = {}

  for (const optionId of optionIds) {
    matrix[optionId.toString()] = Array.from({ length: picks }, (_, index) =>
      parseInt(raw[rankingField(optionId, index + 1)] || '0', 10),
    )
  }

  return matrix
}

/** Misma matriz, pero contando los votos ya persistidos en la tabla `Vote`. */
export function buildRankingMatrixFromVotes(
  votes: { ranking: number[] }[],
  optionIds: number[],
  picks: number = RANKING_PICKS,
): RankingMatrix {
  const matrix = buildRankingMatrix({}, optionIds, picks)

  for (const vote of votes) {
    vote.ranking.slice(0, picks).forEach((optionId, index) => {
      const row = matrix[optionId.toString()]
      if (row) row[index] += 1
    })
  }

  return matrix
}

/**
 * Puntaje tipo Borda para ordenar el podio: con 3 lugares, un primer puesto
 * vale 3, un segundo 2 y un tercero 1.
 */
export function rankingScore(
  positions: number[],
  picks: number = RANKING_PICKS,
): number {
  return positions.reduce(
    (total, times, index) => total + times * (picks - index),
    0,
  )
}
