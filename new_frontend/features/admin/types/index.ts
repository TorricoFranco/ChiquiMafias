import type { StoreItemType } from '@/features/store/types';
import type { SubscriptionTier } from '@/features/subscriptions/types';

// Copia a mano de los enums de Prisma (PricedEntity, PriceCurrency).
export type PricedEntity = 'COIN_PACK' | 'STORE_ITEM' | 'SUBSCRIPTION_PLAN';
export type PriceCurrency = 'ARS' | 'COINS';
export type DiscountScope = 'ALL' | 'BY_TYPE' | 'SPECIFIC_ITEM';

/** Forma de respuesta de los endpoints de admin del backend. */
export interface PricingEnvelope<T> {
    status: 'success';
    message: string;
    data: T;
}

export interface PricingCoinPack {
    id: string;
    name: string;
    coinsAmount: number;
    bonusCoins: number;
    priceARS: number;
    isActive: boolean;
    isPopular: boolean;
}

export interface PricingStoreItem {
    id: string;
    name: string;
    type: StoreItemType;
    assetId: string;
    price: number;
    isActive: boolean;
    isPurchasable: boolean;
}

export interface PricingSubscriptionPlan {
    id: string;
    tier: SubscriptionTier;
    name: string;
    basePriceARS: number;
    isActive: boolean;
}

export interface PricingActiveDiscount {
    id: string;
    name: string;
    percentage: number;
    scope: DiscountScope;
    targetType: StoreItemType | null;
    targetItemId: string | null;
    endDate: string;
}

export interface PriceChangeLogEntry {
    id: string;
    entity: PricedEntity;
    entityId: string;
    entityName: string;
    oldPrice: number;
    newPrice: number;
    currency: PriceCurrency;
    changedByUsername: string;
    createdAt: string;
}

export interface PricingOverview {
    coinPacks: PricingCoinPack[];
    storeItems: PricingStoreItem[];
    subscriptionPlans: PricingSubscriptionPlan[];
    activeDiscounts: PricingActiveDiscount[];
    recentChanges: PriceChangeLogEntry[];
    /** Valor de referencia de una moneda en pesos (COIN_VALUE_ARS del backend). */
    coinValueARS: number;
}

export interface UpdateCoinPackPriceResult {
    coinPack: PricingCoinPack;
    change: PriceChangeLogEntry | null;
}

export interface UpdateStoreItemPriceResult {
    storeItem: PricingStoreItem;
    change: PriceChangeLogEntry | null;
}

export interface UpdateSubscriptionPlanPriceResult {
    subscriptionPlan: PricingSubscriptionPlan;
    change: PriceChangeLogEntry | null;
}
