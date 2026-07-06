export interface IBetSettledPayload {
  userId: string
  status: 'WON' | 'LOST' | 'REFUND'
  coins: number
  multiplier?: number
  matchTitle: string
}

export interface IMatchStartingPayload {
  matchId: string
  homeTeam: string
  awayTeam: string
  potCoins: number
}

export interface IGlobalAnnouncementPayload {
  title: string
  message: string
  type: 'MAINTENANCE' | 'PROMO' | 'SYSTEM_ALERT'
  referenceId?: string
}
