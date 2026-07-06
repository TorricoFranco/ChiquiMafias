export type RateLimitState = {
  timestamps: number[]
  strikes: number
  blockedUntil?: number
}
