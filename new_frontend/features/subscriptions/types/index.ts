export enum SubscriptionTier {
  NONE = "NONE",
  TIER_1 = "TIER_1",
  TIER_2 = "TIER_2",
  TIER_3 = "TIER_3",
}

export enum SubscriptionStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  GRACE_PERIOD = "GRACE_PERIOD",
  CANCELLATION_PENDING = "CANCELLATION_PENDING",
  EXPIRED = "EXPIRED",
}

export interface PlanPricing {
  basePriceARS: number;
  discountedPriceARS: number;
  discountPercentage: number;
  isWeekend: boolean;
  promoMessage: string | null;
  expiresAt: string | null;
  currency: string;
  appliedAt: string;
}

export interface SubscriptionPlanDto {
  id: string;
  tier: SubscriptionTier;
  name: string;
  benefits: string[];
  pricing: PlanPricing;
  upgradeRules: Record<string, number>
  isCurrent: boolean;
}

export interface CheckoutSubscriptionResponse {
  init_point: string;
  external_reference: string;
  subscription_id: string;
  tier: SubscriptionTier;
}

export interface UpgradeSubscriptionResponse {
  init_point: string;
  external_reference: string;
  new_tier: SubscriptionTier;
  bonus_coins: number;
  message: string;
}

export interface SubscriptionDetailResponse {
  id: string | null;
  currentActualTier: SubscriptionTier | null;
  tier: SubscriptionTier | null;
  status: SubscriptionStatus | null;
  startsAt: string | null;
  endsAt: string | null;
  autoRenew: boolean | null;
  mpPreapprovalId?: string;
  mpExternalRef?: string;
}