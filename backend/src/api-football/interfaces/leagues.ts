export interface ApiLeagueResponse {
  league: {
    id: number
    name: string
    country: string
    logo: string
    flag: string
    type: string
  }
  seasons: {
    year: number
    start: string
    end: string
    current: boolean
  }[]
}
