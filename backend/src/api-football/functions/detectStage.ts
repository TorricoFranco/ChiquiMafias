export function detectStage(description?: string): 'APERTURA' | 'CLAUSURA' {
  if (!description) return 'APERTURA'

  const d = description.toLowerCase()

  if (d.includes('clausura')) return 'CLAUSURA'
  if (d.includes('apertura')) return 'APERTURA'

  return 'APERTURA'
}
