export interface ApiTeamResponse {
  team: {
    id: number
    name: string
    code?: string
    country?: string
    founded?: number
    logo: string
  }
  venue?: {
    id: number
    name: string
    address?: string
    city?: string
    capacity?: number
    surface?: string
    image?: string
  }
}
