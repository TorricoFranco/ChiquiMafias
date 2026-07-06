export interface StreakTimelineItem {
  dayNumber: number
  coins: number
  hasSpecialGift: boolean
  giftName: string | null
  status: 'completed' | 'current' | 'upcoming'
}
