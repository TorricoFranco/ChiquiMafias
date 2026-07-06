interface ApiTeamColors {
  primary: string
  number: string
  border: string
}

interface ApiLineupPlayer {
  id: number
  name: string
  number: number
  pos: string // G, D, M, F
  grid: string | null // ej: "1:1"
}

interface ApiLineupCoach {
  id: number
  name: string
  photo?: string
}

interface ApiLineupTeam {
  id: number
  name: string
  logo: string
  colors?: {
    player?: ApiTeamColors
    goalkeeper?: ApiTeamColors
  }
}

interface ApiLineupPlayerEntry {
  player: ApiLineupPlayer
}

export interface ApiLineup {
  id: string
  team: ApiLineupTeam
  formation: string
  startXI: ApiLineupPlayerEntry[]
  substitutes: ApiLineupPlayerEntry[]
  coach: ApiLineupCoach
}
