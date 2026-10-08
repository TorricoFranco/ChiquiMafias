export interface StreakTimelineItem {
    dayNumber: number;
    coins: number;
    hasSpecialGift: boolean;
    giftName: string;
    giftType: string | null;
    status: 'completed' | 'current' | 'upcoming';
}

export interface StreakTimelineResponse {
    currentStreak: number;
    streakRewardClaimed: boolean;
    userTier: string;
    timeline: StreakTimelineItem[];
}

export interface CheckInResponse {
    incremented: boolean;
    currentStreak: number;
    canClaimReward: boolean;
}