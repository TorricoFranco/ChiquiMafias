export interface StreakTimelineItem {
  dayNumber: number;
  coins: number;
  hasSpecialGift: boolean;
  giftName: string | null;
  giftType?: string | null;
  giftAssetId?: string | null;
  status: 'completed' | 'current' | 'upcoming';
}