export type SystemRole = 'USER' | 'MODERATOR' | 'ADMIN' | 'PRESIDENT';

export type SubscriptionTierEnum = 'TIER_1' | 'TIER_2' | 'TIER_3';

export interface FootballTeam {
  id: string;
  name: string;
  slug: string;
  badgeUrl: string;
  tier: number;
}

export type UserStatus = 'ACTIVE' | 'BANNED';

export interface UserEntity {
  id: string;
  name: string;
  email: string;
  username: string | null;
  isFirstLogin: boolean;
  termsAcceptedAt: string | null;
  termsVersion: string | null;
  status: UserStatus;
  mutedUntil: string | null;
  role: SystemRole;
  activeSubscriptionTier: SubscriptionTierEnum | null;
  currentStreak: number;
  lastCheckIn: string | null;
  streakRewardClaimed: boolean;
  activeNameColorId: string | null;
  activeBannerId: string | null;
  activeChatBubbleId: string | null;
  createdAt: string;
  teamId: string | null;
  team?: FootballTeam | null;

  wallet?: {
    balance: number;
  } | null;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedUsersResponse {
  data: UserEntity[];
  meta: PaginationMeta;
}

export interface ChatClient {
  socketId: string;
  userId?: string;
  username: string | null;
  teamName?: string | null;
  badgeUrl?: string | null;
  tier?: string | null;
  role?: string | null;
}

export interface MutedUser {
  id: string;
  username: string;
  email: string;
  mutedUntil: string;
  remainingMinutes: number;
}


export interface AdminStatsResponse {
  pendingPolls: number;
  openMarkets: number;
  openTickets: number;
  pendingReports: number;
  onlineUsers: number;
}