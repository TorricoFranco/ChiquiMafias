
export interface ApiMatch {
  id: string
  date: string
  status_short: 'FT' | 'LIVE' | 'NS'
  home_goals: number | null
  away_goals: number | null
  round: number
  round_label: string
  home_team: { id: string; name: string }
  away_team: { id: string; name: string }
  tournament: 'APERTURA' | 'CLAUSURA'
}