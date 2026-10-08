export const CHAT_RATE_LIMITS = {
  NONE: {
    windowMs: 10_000,
    maxMessages: 5,
    penalties: [15, 30, 120, 300],
  },
  TIER_2: {
    windowMs: 8_000,
    maxMessages: 15,
    penalties: [5, 15, 30],
  },
  TIER_3: {
    windowMs: 5_000,
    maxMessages: 20,
    penalties: [5, 10],
  },
} as const

export const DEFAULT_RATE_LIMIT = CHAT_RATE_LIMITS.NONE
