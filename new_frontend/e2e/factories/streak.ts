import type { StreakTimelineItem, StreakTimelineResponse } from "@/features/streak/types";

export function buildStreakTimeline(overrides: Partial<StreakTimelineResponse> = {}): StreakTimelineResponse {
  const currentStreak = overrides.currentStreak ?? 3;
  const timeline: StreakTimelineItem[] = Array.from({ length: 7 }, (_, i) => {
    const dayNumber = i + 1;
    return {
      dayNumber,
      coins: dayNumber * 50,
      hasSpecialGift: dayNumber === 7,
      giftName: dayNumber === 7 ? "Banner de racha" : "",
      giftType: dayNumber === 7 ? "BANNER" : null,
      status: dayNumber < currentStreak ? "completed" : dayNumber === currentStreak ? "current" : "upcoming",
    };
  });

  return { currentStreak, streakRewardClaimed: false, userTier: "NONE", timeline, ...overrides };
}
