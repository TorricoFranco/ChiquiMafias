export interface ApiFixtureEvent {
  id: number

  time: {
    elapsed: number
    extra?: number | null
  }

  team: {
    id: number
    name: string
    logo?: string
  } | null

  player: {
    id: number
    name: string
  } | null

  assist: {
    id: number
    name: string
  } | null

  type: string // Goal, Card, subst, Var
  detail: string // Normal Goal, Yellow Card, Penalty, Own Goal, etc
  comments?: string | null
  status?: string | null
}
