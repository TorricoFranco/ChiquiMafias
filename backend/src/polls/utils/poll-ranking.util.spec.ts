import {
  buildRankingMatrix,
  buildRankingMatrixFromVotes,
  rankingField,
  rankingScore,
} from './poll-ranking.util'

describe('poll-ranking.util', () => {
  describe('buildRankingMatrix', () => {
    it('arma la matriz desde el hash de Redis', () => {
      const raw = {
        '1:1': '5',
        '1:2': '2',
        '2:3': '4',
      }

      expect(buildRankingMatrix(raw, [1, 2, 3])).toEqual({
        '1': [5, 2, 0],
        '2': [0, 0, 4],
        '3': [0, 0, 0],
      })
    })

    it('devuelve una fila en cero por cada opción que nadie eligió', () => {
      expect(buildRankingMatrix({}, [7, 9])).toEqual({
        '7': [0, 0, 0],
        '9': [0, 0, 0],
      })
    })

    it('respeta la cantidad de lugares del podio', () => {
      expect(buildRankingMatrix({ '1:1': '3' }, [1], 2)).toEqual({
        '1': [3, 0],
      })
    })
  })

  describe('buildRankingMatrixFromVotes', () => {
    it('cuenta en qué posición quedó cada opción', () => {
      const votes = [
        { ranking: [1, 2, 3] },
        { ranking: [1, 3, 2] },
        { ranking: [2, 1, 3] },
      ]

      expect(buildRankingMatrixFromVotes(votes, [1, 2, 3])).toEqual({
        '1': [2, 1, 0],
        '2': [1, 1, 1],
        '3': [0, 1, 2],
      })
    })

    it('ignora los votos sin podio y las opciones que ya no existen', () => {
      const votes = [{ ranking: [] }, { ranking: [1, 99, 2] }]

      expect(buildRankingMatrixFromVotes(votes, [1, 2])).toEqual({
        '1': [1, 0, 0],
        '2': [0, 0, 1],
      })
    })
  })

  describe('rankingScore', () => {
    it('da 3 puntos al primer puesto, 2 al segundo y 1 al tercero', () => {
      expect(rankingScore([1, 0, 0])).toBe(3)
      expect(rankingScore([0, 1, 0])).toBe(2)
      expect(rankingScore([0, 0, 1])).toBe(1)
      expect(rankingScore([2, 1, 3])).toBe(11)
    })

    it('un podio con todo en cero no suma', () => {
      expect(rankingScore([0, 0, 0])).toBe(0)
    })
  })

  it('rankingField arma el campo del hash', () => {
    expect(rankingField(7, 2)).toBe('7:2')
  })
})
