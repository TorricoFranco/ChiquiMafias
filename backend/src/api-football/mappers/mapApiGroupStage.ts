export function mapApiGroupToStage(groupRaw: string) {
  const normalized = groupRaw.toLowerCase()

  let stage = ''
  let groupName: string | null = null

  if (normalized.includes('anual')) {
    stage = 'ANNUAL'
  } else if (normalized.includes('promedios')) {
    stage = 'AVERAGES'
  } else {
    if (normalized.includes('apertura')) {
      stage = 'APERTURA'
    } else if (normalized.includes('clausura')) {
      stage = 'CLAUSURA'
    } else {
      const parts = groupRaw.split(/[,–-]/)
      stage = parts[0] ? parts[0].trim().toUpperCase() : ''
    }

    if (normalized.includes('b')) {
      groupName = 'B'
    } else if (normalized.includes('a')) {
      groupName = 'A'
    }
  }

  return { stage, groupName }
}