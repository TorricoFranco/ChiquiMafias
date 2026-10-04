export interface PublicUser {
  name: string | null;
  username: string | null;
  activeNameColorId?: string | null;
  activeBannerId?: string | null;
  activeChatBubbleId?: string | null;
  activeSubscriptionTier?: string | null;
  team: {
    name: string | null;
    id: string | null;
    badgeUrl: string | null;
  } | null;
}

export interface UserStats {
  id: string;
  userId: string;
  totalBetsPlaced: number;
  totalBetsWon: number;
  totalCoinsStaked: number;
  totalCoinsWon: number;
  highestMultiplier: number;
  currentWinStreak: number;
  longestWinStreak: number;
  updatedAt?: string;
  user?: PublicUser;
}

export interface LeaderboardUserStats {
  id: string;
  userId: string;
  totalBetsPlaced: number;
  totalBetsWon: number;
  totalCoinsStaked: number;
  totalCoinsWon: number;
  highestMultiplier: number;
  currentWinStreak: number;
  longestWinStreak: number;
  user: PublicUser;
}


export interface GlobalStats {
  totalUsers: number;
  totalBets: number;
  totalVolumeStaked: number;
  totalVolumeWon: number;
}


export interface TopActiveStreakUser {
  id: string;
  username: string;
  name: string | null;
  currentStreak: number;
  team: {
    badgeUrl: string | null;
  } | null;
}

export interface TopChatterUser {
  id: string;
  username: string;
  name: string | null;
  team: {
    badgeUrl: string | null;
  } | null;
  messageCount: number;
}

export type LeaderboardCategory =
  | 'top-earners'
  | 'top-streaks'
  | 'highest-multipliers'
  | 'most-active'
  | 'top-stakers'
  | 'top-active'
  | 'top-chatters';

export interface LeaderboardMeta {
  id: LeaderboardCategory;
  title: string;
  shortTitle: string;
  description: string;
  iconName: string;
  metricLabel: string;
  metricSuffix?: string;
  isCustomType?: 'streak' | 'chat';
}
