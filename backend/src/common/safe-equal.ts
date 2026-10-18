import { createHash, timingSafeEqual } from 'crypto'

// Compara secretos en tiempo constante. Se hashean antes para que timingSafeEqual
// reciba buffers del mismo largo (no filtra la longitud) y tolera undefined.
export function safeEqual(received: unknown, expected: unknown): boolean {
  if (typeof received !== 'string' || typeof expected !== 'string') return false
  if (expected.length === 0) return false

  const a = createHash('sha256').update(received).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}
