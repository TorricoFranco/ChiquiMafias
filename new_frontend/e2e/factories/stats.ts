import type { GlobalStats, LeaderboardUserStats, TopActiveStreakUser, UserStats } from "@/features/stats/types";
import type { CheckInResponse } from "@/features/streak/types";
import { LOCAL_IMAGE, nextId } from "./ids";

export function buildGlobalStats(overrides: Partial<GlobalStats> = {}): GlobalStats {
  return { totalUsers: 1520, totalBets: 8400, totalVolumeStaked: 1_250_000, totalVolumeWon: 980_000, ...overrides };
}

/** Fila de los rankings de apuestas (`/stats/top-earners`, `top-streaks`, etc.). */
export function buildLeaderboardEntry(username: string, overrides: Partial<LeaderboardUserStats> = {}): LeaderboardUserStats {
  return {
    ...buildUserStats({ userId: nextId("user-ranking"), totalCoinsWon: 5000, totalBetsPlaced: 40, totalBetsWon: 22 }),
    user: { name: username, username, team: { id: "team-boca", name: "Boca Juniors", badgeUrl: LOCAL_IMAGE } },
    ...overrides,
  };
}

export function buildTopActiveStreakUser(username: string, currentStreak: number): TopActiveStreakUser {
  return { id: nextId("user-streak"), username, name: username, currentStreak, team: { badgeUrl: LOCAL_IMAGE } };
}

export function buildUserStats(overrides: Partial<UserStats> = {}): UserStats {
  return {
    id: nextId("stats"),
    userId: "user-1",
    totalBetsPlaced: 0,
    totalBetsWon: 0,
    totalCoinsStaked: 0,
    totalCoinsWon: 0,
    highestMultiplier: 0,
    currentWinStreak: 0,
    longestWinStreak: 0,
    ...overrides,
  };
}

export function buildCheckIn(overrides: Partial<CheckInResponse> = {}): CheckInResponse {
  return { incremented: false, currentStreak: 3, canClaimReward: false, ...overrides };
}
