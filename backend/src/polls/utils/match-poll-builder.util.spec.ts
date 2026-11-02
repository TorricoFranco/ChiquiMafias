import {
  MATCH_REVIEW_CATEGORIES,
  MATCH_REVIEW_QUESTIONS,
} from '../constants/match-polls.constant'
import {
  buildMatchReviewPoll,
  buildRefereePoll,
  describeMatchRound,
  FinishedMatchForPolls,
  refereeDisplayName,
} from './match-poll-builder.util'

const buildMatch = (
  over: Partial<FinishedMatchForPolls> = {},
): FinishedMatchForPolls => ({
  tournament: 'CLAUSURA',
  round: 'Clausura - 5',
  home_goals: 2,
  away_goals: 1,
  home_penalty_goals: null,
  away_penalty_goals: null,
  home_team: { name: 'Boca Juniors' },
  away_team: { name: 'River Plate' },
  league: {
    name: 'Liga Profesional Argentina',
    short_name: 'Liga Profesional',
  },
  ...over,
})

// Un rng que devuelve los valores en orden y vuelve a empezar al terminarlos.
const sequence = (...values: number[]) => {
  let index = 0
  return () => values[index++ % values.length]
}

describe('refereeDisplayName', () => {
  it('Debe quedarse con el nombre cuando API-Football manda también el país', () => {
    expect(refereeDisplayName('Facundo Tello, Argentina')).toBe('Facundo Tello')
  })

  it('Debe devolver el nombre tal cual si no trae país', () => {
    expect(refereeDisplayName('Facundo Tello')).toBe('Facundo Tello')
  })

  it('Debe juntar los espacios repetidos', () => {
    expect(refereeDisplayName('  Facundo   Tello , Argentina')).toBe(
      'Facundo Tello',
    )
  })

  it.each([null, undefined, '', '   ', ', Argentina'])(
    'Debe devolver null si no hay nombre (%p)',
    (raw) => {
      expect(refereeDisplayName(raw)).toBeNull()
    },
  )
})

describe('describeMatchRound', () => {
  const liga = {
    name: 'Liga Profesional Argentina',
    short_name: 'Liga Profesional',
  }

  it.each([
    ['CLAUSURA', 'Clausura - 5', 'Fecha 5 Clausura'],
    ['APERTURA', 'Regular Season - 12', 'Fecha 12 Apertura'],
    // Typo que ya está en el mapa de rondas del Apertura (liga-dividida.round-map)
    ['APERTURA', 'Regular Sesaon - 10', 'Fecha 10 Apertura'],
    ['CLAUSURA', 'Clausura - octavos', 'Octavos de final Clausura'],
    ['CLAUSURA', 'Clausura - cuartos', 'Cuartos de final Clausura'],
    ['CLAUSURA', 'Clausura - semifinal', 'Semifinal Clausura'],
    ['CLAUSURA', 'Clausura - final', 'Final Clausura'],
    ['APERTURA', 'Regular Season - octavos', 'Octavos de final Apertura'],
    ['CLAUSURA', 'Clausura - Zona rara', 'Clausura - Zona rara'],
  ])('%s · %s debe decirse "%s"', (tournament, round, expected) => {
    expect(describeMatchRound({ tournament, round, league: liga })).toBe(
      expected,
    )
  })

  it('Debe usar el nombre de la competición en una de eliminación directa', () => {
    expect(
      describeMatchRound({
        tournament: 'ELIMINACION',
        round: 'Octavos de final',
        league: { name: 'Copa Argentina', short_name: null },
      }),
    ).toBe('Octavos de final Copa Argentina')
  })

  it('Debe preferir el nombre corto de la competición si lo tiene', () => {
    expect(
      describeMatchRound({
        tournament: 'ELIMINACION',
        round: 'Final',
        league: { name: 'Copa Argentina 2026', short_name: 'Copa Argentina' },
      }),
    ).toBe('Final Copa Argentina')
  })
})

describe('buildRefereePoll', () => {
  it('Debe titular la encuesta con el árbitro, el partido y la fecha', () => {
    const poll = buildRefereePoll(buildMatch(), 'Facundo Tello')

    expect(poll.title).toBe(
      '¿Cómo viste el arbitraje de Facundo Tello en Boca Juniors vs River Plate (Fecha 5 Clausura)?',
    )
  })

  it('Debe ser una puntuación de 1 a 5 estrellas con las opciones fijas', () => {
    const poll = buildRefereePoll(buildMatch(), 'Facundo Tello')

    expect(poll.type).toBe('RATING')
    expect(poll.options).toEqual([
      { id: 1, label: '1' },
      { id: 2, label: '2' },
      { id: 3, label: '3' },
      { id: 4, label: '4' },
      { id: 5, label: '5' },
    ])
    expect(poll.config).toEqual({ scale: 5 })
  })

  it('Debe describir el resultado y la fecha para el feed', () => {
    const poll = buildRefereePoll(buildMatch(), 'Facundo Tello')

    expect(poll.description).toBe(
      'Boca Juniors 2-1 River Plate · Fecha 5 Clausura',
    )
  })

  it('Debe sumar los penales a la descripción si los hubo', () => {
    const poll = buildRefereePoll(
      buildMatch({
        round: 'Clausura - cuartos',
        home_goals: 1,
        away_goals: 1,
        home_penalty_goals: 4,
        away_penalty_goals: 3,
      }),
      'Facundo Tello',
    )

    expect(poll.description).toBe(
      'Boca Juniors 1-1 River Plate (pen. 4-3) · Cuartos de final Clausura',
    )
  })

  it('Debe describir el partido sin marcador si no hay goles cargados', () => {
    const poll = buildRefereePoll(
      buildMatch({ home_goals: null, away_goals: null }),
      'Facundo Tello',
    )

    expect(poll.description).toBe(
      'Boca Juniors vs River Plate · Fecha 5 Clausura',
    )
  })
})

describe('buildMatchReviewPoll', () => {
  it('Debe armar una encuesta clásica con las cuatro categorías en orden fijo', () => {
    const poll = buildMatchReviewPoll(buildMatch())

    expect(poll.type).toBe('CLASSIC')
    expect(poll.config).toBeNull()
    expect(poll.options.map((option) => option.id)).toEqual([1, 2, 3, 4])
  })

  it('Debe sacar la frase de cada opción del banco de su categoría', () => {
    const poll = buildMatchReviewPoll(
      buildMatch(),
      sequence(0.3, 0.7, 0.1, 0.9),
    )

    poll.options.forEach((option, index) => {
      expect(MATCH_REVIEW_CATEGORIES[index].phrases).toContain(option.label)
    })
  })

  it('Con el rng en 0 debe tomar la primera pregunta y la primera frase de cada categoría', () => {
    const poll = buildMatchReviewPoll(buildMatch(), () => 0)

    expect(poll.title).toBe(
      `${MATCH_REVIEW_QUESTIONS[0]} (Boca Juniors vs River Plate)`,
    )
    expect(poll.options.map((option) => option.label)).toEqual(
      MATCH_REVIEW_CATEGORIES.map((category) => category.phrases[0]),
    )
  })

  it('Con el rng casi en 1 debe tomar la última pregunta y la última frase de cada categoría', () => {
    const poll = buildMatchReviewPoll(buildMatch(), () => 0.999)

    expect(poll.title).toBe(
      `${MATCH_REVIEW_QUESTIONS[MATCH_REVIEW_QUESTIONS.length - 1]} (Boca Juniors vs River Plate)`,
    )
    expect(poll.options.map((option) => option.label)).toEqual(
      MATCH_REVIEW_CATEGORIES.map(
        (category) => category.phrases[category.phrases.length - 1],
      ),
    )
  })

  it('No debe romperse si el rng devuelve 1', () => {
    expect(() => buildMatchReviewPoll(buildMatch(), () => 1)).not.toThrow()
  })

  it('Debe dar preguntas y frases distintas según el rng, con las mismas categorías', () => {
    const first = buildMatchReviewPoll(buildMatch(), () => 0)
    const second = buildMatchReviewPoll(buildMatch(), () => 0.5)

    expect(first.title).not.toBe(second.title)
    expect(first.options.map((o) => o.label)).not.toEqual(
      second.options.map((o) => o.label),
    )
    expect(first.options.map((o) => o.id)).toEqual(
      second.options.map((o) => o.id),
    )
  })

  it('Debe describir el resultado y la fecha para el feed', () => {
    const poll = buildMatchReviewPoll(buildMatch())

    expect(poll.description).toBe(
      'Boca Juniors 2-1 River Plate · Fecha 5 Clausura',
    )
  })
})

describe('bancos de preguntas y frases', () => {
  const phrases = MATCH_REVIEW_CATEGORIES.flatMap((category) => [
    ...category.phrases,
  ])

  it('Debe haber 10 preguntas distintas', () => {
    expect(MATCH_REVIEW_QUESTIONS).toHaveLength(10)
    expect(new Set(MATCH_REVIEW_QUESTIONS).size).toBe(10)
  })

  it('Debe haber cuatro categorías con ids de 1 a 4 y cinco frases cada una', () => {
    expect(MATCH_REVIEW_CATEGORIES.map((category) => category.id)).toEqual([
      1, 2, 3, 4,
    ])
    MATCH_REVIEW_CATEGORIES.forEach((category) => {
      expect(category.phrases).toHaveLength(5)
    })
  })

  it('Ninguna frase debe repetirse ni pasar el máximo de 60 caracteres de una opción', () => {
    expect(new Set(phrases).size).toBe(phrases.length)
    phrases.forEach((phrase) => {
      expect(phrase.length).toBeLessThanOrEqual(60)
    })
  })

  it('Cualquier combinación de frases debe pasar la validación de las opciones', () => {
    // Una frase repetida o larga hace que buildPollShape lance BadRequestException.
    for (const random of [0, 0.2, 0.4, 0.6, 0.8, 0.999]) {
      expect(() =>
        buildMatchReviewPoll(buildMatch(), () => random),
      ).not.toThrow()
    }
  })
})
