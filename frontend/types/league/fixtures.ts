import { ApiMatch } from "./apiMatch"

export type Matchday = {
  matchday: number
  matches: ApiMatch[]
}

export type FixturesResponse = {
  matchdays: Matchday[]
  activeMatchday: number
}