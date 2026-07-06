export interface ApiRoundsResponse {
  get: string
  parameters: {
    league: string
    season: string
  }
  errors: any[]
  results: number
  paging: {
    current: number
    total: number
  }
  response: string[]
}
