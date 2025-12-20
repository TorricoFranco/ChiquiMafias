export interface FixturesResponseDTO {
  response: {
    fixture: {
      id: number
      date: string
      status: {
        short: string
      }
    }
    teams: {
      home: { id: number; name: string }
      away: { id: number; name: string }
    }
  }[]
}
