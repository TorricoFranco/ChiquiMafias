export function detectTournament(description?: string): {
  stage: 'APERTURA' | 'CLAUSURA' | null
  group: 'A' | 'B' | null
} {
  if (!description) {
    return { stage: null, group: null }
  }

  const d = description.toLowerCase()

  let stage: 'APERTURA' | 'CLAUSURA' | null = null

  if (d.includes('clausura')) stage = 'CLAUSURA'
  else if (d.includes('regular')) stage = 'APERTURA'

  let group: 'A' | 'B' | null = null
  if (d.includes('group a') || d.includes('grupo a')) group = 'A'
  else if (d.includes('group b') || d.includes('grupo b')) group = 'B'

  return { stage, group }
}
