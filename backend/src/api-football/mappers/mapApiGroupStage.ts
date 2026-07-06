export function mapApiGroupToStage(groupRaw: string) {
  let stage = ''
  let groupName: string | null = null

  const normalized = groupRaw.toLowerCase()

  if (normalized.includes('anual')) {
    stage = 'ANNUAL'
  } else if (normalized.includes('promedios')) {
    stage = 'AVERAGES'
  } else {
    // "Apertura, Group A" -> ["Apertura", " Group A"]
    const parts = groupRaw.split(',')
    stage = parts[0].trim().toUpperCase() // APERTURA / CLAUSURA

    if (parts[1]) {
      groupName = parts[1].toLowerCase().includes('group b') ? 'B' : 'A'
    }
  }

  return { stage, groupName }
}
