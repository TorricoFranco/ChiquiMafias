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
    activeNameColorId: string | null;
    activeBannerId: string | null;
    activeChatBubbleId: string | null;
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
    isBanned: boolean;
    isLoginModalOpen: boolean;
    isStreakModalOpen: boolean;
    activeNameColorId: string | null;
    activeBannerId: string | null;
    activeChatBubbleId: string | null;


    setLoginModalOpen: (isOpen: boolean) => void;
    setBalance: (balance: number) => void;
    setIsBanned: (value: boolean) => void;
    setStreak: (currentStreak: number) => void;
    setUserInfo: (info: Partial<Omit<UserState, 'setUserInfo' | 'logout' | 'setBalance' | 'setStreakInfo' | 'updateAfterClaim'>>) => void;
    setStreakInfo: (currentStreak: number, streakRewardClaimed: boolean) => void;
    updateAfterClaim: (newBalance: number, newStreak: number) => void;
    logout: (socketDisconnectFn?: () => void) => Promise<void>;
    setIsStreakModalOpen: (isOpen: boolean) => void;
    setEquippedItem: (type: 'NAME_COLOR' | 'BANNER' | 'CHAT_BUBBLE', itemId: string | null) => void;
    updateCosmetic: (key: string, value: string | null) => void
}

