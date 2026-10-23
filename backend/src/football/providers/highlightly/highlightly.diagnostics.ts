import { Logger } from '@nestjs/common'

// Diagnóstico de Highlightly para las pruebas en vivo: valores que no sabemos
// traducir ([MAPEO]) y consumo de la cuota diaria ([CUOTA]).

const mappingLogger = new Logger('HighlightlyMapeo')
const warnedUnmapped = new Set<string>()

/**
 * Avisa una sola vez por valor que Highlightly mandó algo que no sabemos
 * traducir (un estado, un tipo de evento, una estadística). El contexto solo
 * acompaña el primer aviso.
 */
export function warnUnmapped(kind: string, value: string, context?: string) {
  const key = `${kind}:${value}`
  if (warnedUnmapped.has(key)) return
  warnedUnmapped.add(key)
  mappingLogger.warn(
    `[MAPEO] ${kind} sin traducir: "${value}"${context ? ` (${context})` : ''}`,
  )
}

/** Solo para tests. */
export function resetUnmappedWarnings() {
  warnedUnmapped.clear()
}

const HOUR_MS = 60 * 60 * 1000
// Por debajo de esta fracción de la cuota se avisa (como mucho una vez por hora).
const LOW_QUOTA_RATIO = 0.2

type QuotaLogger = Pick<Logger, 'log' | 'warn'>

/**
 * Cuenta los pedidos por endpoint y cada hora deja un resumen con lo que queda
 * de la cuota según los headers `x-ratelimit-*` de la respuesta.
 */
export class HighlightlyQuota {
  private counts = new Map<string, number>()
  private windowStart: number
  private remaining: number | null = null
  private limit: number | null = null
  private lowQuotaWarnedAt: number | null = null

  constructor(
    private readonly logger: QuotaLogger,
    private readonly now: () => number = Date.now,
  ) {
    this.windowStart = this.now()
  }

  /** `outcome` es el status HTTP o `'error'` si no hubo respuesta (o fue 5xx). */
  record(
    url: string,
    outcome: number | 'error',
    headers?: Record<string, unknown>,
  ) {
    const endpoint = url.replace(/\/\d+(?=\/|$)/g, '/:id')
    const key =
      outcome === 'error' || outcome >= 400
        ? `${endpoint} (${outcome})`
        : endpoint
    this.counts.set(key, (this.counts.get(key) ?? 0) + 1)

    this.readHeaders(headers)
    this.warnIfLow()

    if (this.now() - this.windowStart >= HOUR_MS) this.report()
  }

  private readHeaders(headers?: Record<string, unknown>) {
    const read = (name: string) => {
      const value = headers?.[name]
      if (value === undefined || value === null || value === '') return null
      const n = Number(value)
      return Number.isFinite(n) ? n : null
    }
    this.remaining = read('x-ratelimit-requests-remaining') ?? this.remaining
    this.limit = read('x-ratelimit-requests-limit') ?? this.limit
  }

  private warnIfLow() {
    if (this.remaining === null || !this.limit) return
    if (this.remaining >= this.limit * LOW_QUOTA_RATIO) return
    const now = this.now()
    if (
      this.lowQuotaWarnedAt !== null &&
      now - this.lowQuotaWarnedAt < HOUR_MS
    ) {
      return
    }
    this.lowQuotaWarnedAt = now
    this.logger.warn(
      `[CUOTA] Quedan ${this.remaining} de ${this.limit} pedidos de Highlightly (menos del ${LOW_QUOTA_RATIO * 100} %)`,
    )
  }

  private report() {
    const total = [...this.counts.values()].reduce((a, n) => a + n, 0)
    const detail = [...this.counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([endpoint, n]) => `${endpoint}: ${n}`)
      .join(', ')
    const left =
      this.remaining === null
        ? 'sin dato de cuota'
        : `quedan ${this.remaining}${this.limit ? ` de ${this.limit}` : ''}`
    this.logger.log(
      `[CUOTA] ${total} pedidos en la última hora (${detail}) · ${left}`,
    )
    this.counts.clear()
    this.windowStart = this.now()
  }
}
