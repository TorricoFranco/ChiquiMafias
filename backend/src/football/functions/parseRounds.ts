export function parseRound(round: string) {
  // fase (si existe)
  const phaseMatch = round.match(/^(.+?)\s-\s/)
  const phase = phaseMatch ? phaseMatch[1] : null

  // tipo
  let type: 'REGULAR' | 'PLAYOFF' = 'REGULAR'

  if (
    round.includes('Final') ||
    round.includes('Quarter') ||
    round.includes('Semi') ||
    round.includes('Round of')
  ) {
    type = 'PLAYOFF'
  }

  // orden (solo para fechas numeradas)
  const orderMatch = round.match(/(\d+)$/)
  const order = orderMatch ? Number(orderMatch[1]) : null

  return { phase, type, order }
}
