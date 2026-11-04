/** Estados de un partido jugado hasta el final: tiempo normal, alargue o penales. */
export const PLAYED_MATCH_STATUSES = ['FT', 'AET', 'PEN']

/**
 * Hasta cuántas horas después del inicio de un partido se le crean las
 * encuestas. Así, tras una caída larga del backend, no se arman encuestas de
 * partidos que terminaron hace días.
 */
export const MATCH_POLLS_LOOKBACK_MS = 12 * 60 * 60 * 1000

/** Cuánto queda abierta cada encuesta de partido desde que se crea. */
export const MATCH_POLLS_DURATION_MS = 48 * 60 * 60 * 1000

export const MATCH_POLLS_ICON = 'FOOTBALL'

/**
 * Preguntas de la encuesta "¿qué te pareció el partido?". Cada partido usa una,
 * para que no parezca una plantilla. Cambian el texto, no la experiencia: las
 * respuestas son siempre las mismas cuatro categorías.
 */
export const MATCH_REVIEW_QUESTIONS: readonly string[] = [
  '¿Con qué sensación te quedaste?',
  'Bueno, ¿valió la pena mirar los 90 minutos?',
  '¿Qué balance hacés del partido?',
  '¿Se jugó bien o estamos siendo generosos?',
  '¿Qué nos dejó este encuentro?',
  '¿Fue fútbol o una prueba de paciencia?',
  'Después de esto, ¿qué opinión te queda?',
  '¿Cómo calificás lo que acabamos de ver?',
  '¿Te convenció lo que viste?',
  '¿Qué te pareció el espectáculo?',
]

export interface MatchReviewCategory {
  /**
   * Id de la opción en la encuesta. Es el mismo en todos los partidos (1 es
   * siempre "muy bueno"), así los resultados se pueden comparar entre partidos
   * aunque la frase visible cambie.
   */
  id: number
  key: 'MUY_BUENO' | 'BUENO' | 'REGULAR' | 'MALO'
  /** Frases posibles de la categoría; cada partido usa una. */
  phrases: readonly string[]
}

/** De mejor a peor: el orden de las opciones es el orden de esta lista. */
export const MATCH_REVIEW_CATEGORIES: readonly MatchReviewCategory[] = [
  {
    id: 1,
    key: 'MUY_BUENO',
    phrases: [
      'De esos partidos que da gusto mirar.',
      'Nos dieron fulbo del bueno.',
      'Valió la pena quedarse hasta el final.',
      'Sácala del ángulo premier.',
      'Para verlo de nuevo.',
    ],
  },
  {
    id: 2,
    key: 'BUENO',
    phrases: [
      'Tuvo lo suyo, no estuvo nada mal.',
      'Se dejó ver, hubo fútbol.',
      'Bastante digno el espectáculo.',
      'Cumplió, tampoco vamos a exagerar.',
      'No fue una obra de arte, pero estuvo bien.',
    ],
  },
  {
    id: 3,
    key: 'REGULAR',
    phrases: [
      'Se esperaba bastante más.',
      'Mucha expectativa para tan poco fútbol.',
      'Tuvo sus momentos, pero quedó debiendo.',
      'Ni fu ni fa.',
      'Pasó sin pena ni gloria.',
    ],
  },
  {
    id: 4,
    key: 'MALO',
    phrases: [
      'Para el olvido.',
      'Qué manera de hacer tiempo.',
      'Noventa minutos que no vuelven.',
      'Costaba mantener los ojos abiertos.',
      'Partido de la B Metro.',
    ],
  },
]
