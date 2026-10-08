export enum SubscriptionTier {
  TIER_1 = 'TIER_1',
  TIER_2 = 'TIER_2',
  TIER_3 = 'TIER_3',
  NONE = 'NONE'
}

export enum SystemRole {
  USER = 'USER',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN',
  PRESIDENT = 'PRESIDENT',
}

export interface TierUiConfig {
  badge?: string;
  badgeColor?: string;
  textColor?: string;
  popularTag?: boolean;
  vipTag?: boolean;
  bonusCoins?: number;
}

export const TIER_UI_CONFIG: Record<string, TierUiConfig> = {
  [SubscriptionTier.TIER_1]: {
    badge: 'POPULAR',
    badgeColor: '#c6c9ab',
    textColor: '#000000',
  },
  [SubscriptionTier.TIER_2]: {
    badge: 'PLATEÍSTA PRO',
    badgeColor: '#d2f000',
    textColor: '#000000',
  },
  [SubscriptionTier.TIER_3]: {
    badge: 'PALCO VIP',
    badgeColor: '#e5e2e1',
    textColor: '#000000',
  },
};

export const ROLE_UI_CONFIG: Record<string, { badge: string; className: string }> = {
  [SystemRole.MODERATOR]: {
    badge: 'Jefe de Barra',
    className: 'bg-blue-600 text-white border border-blue-400/50',
  },
  [SystemRole.ADMIN]: {
    badge: 'Admin',
    className: 'bg-red-600 text-white border border-red-400/50',
  },
  [SystemRole.PRESIDENT]: {
    badge: 'Presidente',
    className: 'bg-gradient-to-r from-amber-400 to-yellow-600 text-black border border-amber-300',
  },
};