export type Role = 'USER' | 'MODERATOR' | 'ADMIN' | 'PRESIDENT';
export type SubscriptionTier = 'NONE' | 'TIER_1' | 'TIER_2' | 'TIER_3';

export interface UserTeam {
    id: string;
    name: string;
    slug: string;
    badgeUrl: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    username: string | null;
    isFirstLogin: boolean;
    role: Role;
    tier: SubscriptionTier;
    teamId: string | null;
    team: UserTeam | null;
}

export interface UserState {
    id: string | null;
    name: string | null;
    username: string | null;
    team: UserTeam | null;
    role: Role | null;
    tier: SubscriptionTier;
    isFirstLogin: boolean;
    accessToken: string | null;
    balance: number;
    currentStreak: number;
    streakRewardClaimed: boolean;
    openStreakModalOnMount: boolean;
    isBanned: boolean;


    // Actions
    setBalance: (balance: number) => void;
    setIsBanned: (value: boolean) => void;
    setUserInfo: (info: Partial<Omit<UserState, 'setUserInfo' | 'logout' | 'setBalance' | 'setStreakInfo' | 'updateAfterClaim'>>) => void;
    setStreakInfo: (currentStreak: number, streakRewardClaimed: boolean) => void;
    updateAfterClaim: (newBalance: number, newStreak: number) => void;
    logout: (socketDisconnectFn?: () => void) => Promise<void>;
}