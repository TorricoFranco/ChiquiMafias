/** Normaliza un nombre de equipo: sin acentos, minúsculas y solo letras/números. */
export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’`´]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const STOP_WORDS = new Set([
  'club',
  'atletico',
  'ca',
  'de',
  'la',
  'del',
  'cd',
  'fc',
])

function tokens(name: string): string[] {
  return normalizeName(name)
    .split(' ')
    .filter((t) => t && !STOP_WORDS.has(t))
}

const squash = (name: string) => normalizeName(name).replace(/ /g, '')

function isSubsequence(short: string, long: string): boolean {
  let i = 0
  for (const ch of long) if (ch === short[i]) i += 1
  return i === short.length
}

export const EXACT_SCORE = 0.95

/**
 * Parecido entre dos nombres de equipo, de 0 a 1.
 * 1 = idénticos tras normalizar; 0.95 = mismas palabras significativas;
 * menos = coincidencia parcial (siglas como "Gimnasia L.P." o palabras en común).
 */
export function nameScore(a: string, b: string): number {
  if (normalizeName(a) === normalizeName(b)) return 1

  const ta = tokens(a)
  const tb = tokens(b)
  if (ta.length && ta.join(' ') === tb.join(' ')) return EXACT_SCORE

  const sa = squash(a)
  const sb = squash(b)
  const [short, long] = sa.length <= sb.length ? [sa, sb] : [sb, sa]

  const common = ta.filter((t) => tb.includes(t)).length
  const tokenScore = common / Math.max(ta.length, tb.length, 1)
  const subsequence = short.length >= 5 && isSubsequence(short, long) ? 0.7 : 0

  return Math.max(tokenScore * 0.9, subsequence)
}
