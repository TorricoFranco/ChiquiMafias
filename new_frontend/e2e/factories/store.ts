import type { BuyPackResponse, CoinPack } from "@/features/coins-shop/types";
import type { InventoryItem } from "@/features/inventory/types";
import type { StoreItem } from "@/features/store/types";
import type { SubscriptionPlanDto, SubscriptionTier } from "@/features/subscriptions/types";
import { MP_CHECKOUT_URL } from "../support/third-party";
import { nextId } from "./ids";

export function buildStoreItem(overrides: Partial<StoreItem> = {}): StoreItem {
  const price = overrides.price ?? 500;
  return {
    id: nextId("item"),
    name: "Banner Bombonera",
    description: "Lucí la Bombonera en tu perfil.",
    type: "BANNER",
    price,
    assetId: "bombonera",
    isActive: true,
    isOwned: false,
    ownedQuantity: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    currentPrice: price,
    isDiscounted: false,
    ...overrides,
  };
}

type InventoryOverrides = Omit<Partial<InventoryItem>, "item"> & { item?: Partial<InventoryItem["item"]> };

export function buildInventoryItem(overrides: InventoryOverrides = {}): InventoryItem {
  const { item, ...rest } = overrides;
  const itemId = item?.id ?? nextId("item");
  return {
    id: nextId("inventory"),
    itemId,
    quantity: 1,
    isEquipped: false,
    createdAt: "2026-02-01T00:00:00.000Z",
    isExclusive: false,
    ...rest,
    item: {
      id: itemId,
      name: "Banner Bombonera",
      description: "Lucí la Bombonera en tu perfil.",
      type: "BANNER",
      assetId: "bombonera",
      ...item,
    },
  };
}

export function buildCoinPack(overrides: Partial<CoinPack> = {}): CoinPack {
  return {
    id: nextId("pack"),
    name: "Pack Hincha",
    description: "Para arrancar la temporada.",
    coinsAmount: 1000,
    bonusCoins: 0,
    isPopular: false,
    priceARS: 1500,
    isActive: true,
    ...overrides,
  };
}

export function buildBuyPackResponse(initPoint = MP_CHECKOUT_URL): BuyPackResponse {
  return {
    status: "success",
    message: "Preferencia creada",
    data: { orderId: nextId("order"), preferenceId: nextId("preference"), initPoint, sandboxInitPoint: initPoint },
  };
}

// En la app SubscriptionTier es un enum; acá alcanza con sus valores como string.
type PaidTier = Exclude<`${SubscriptionTier}`, "NONE">;

const PLAN_DEFAULTS: Record<PaidTier, { name: string; price: number }> = {
  TIER_1: { name: "Popular", price: 2_000 },
  TIER_2: { name: "Platea", price: 4_000 },
  TIER_3: { name: "Palco VIP", price: 8_000 },
};

export function buildPlan(tier: PaidTier, overrides: Partial<SubscriptionPlanDto> = {}): SubscriptionPlanDto {
  const { name, price } = PLAN_DEFAULTS[tier];
  return {
    id: nextId("plan"),
    tier: tier as SubscriptionTier,
    name,
    benefits: ["Multiplicador en apuestas", "Insignia en el chat"],
    pricing: {
      basePriceARS: price,
      discountedPriceARS: price,
      discountPercentage: 0,
      isWeekend: false,
      promoMessage: null,
      expiresAt: null,
      currency: "ARS",
      appliedAt: "2026-05-10T12:00:00.000Z",
    },
    upgradeRules: {},
    isCurrent: false,
    ...overrides,
  };
}
