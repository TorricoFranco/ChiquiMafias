// src/types/subscription.ts

// ==========================================
// ENUMS ESPEJADOS DE PRISMA (Exactamente igual al Schema)
// ==========================================
export enum SubscriptionTier {
  NONE = "NONE",
  TIER_1 = "TIER_1", // Ej: Socio Bronce
  TIER_2 = "TIER_2", // Ej: Socio Plata
  TIER_3 = "TIER_3", // Ej: Socio Oro
}

export enum SubscriptionStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  GRACE_PERIOD = "GRACE_PERIOD",
  CANCELLATION_PENDING = "CANCELLATION_PENDING",
  EXPIRED = "EXPIRED",
}

// ==========================================
// INTERFACES DE RESPUESTA (DTOs del Front)
// ==========================================
export interface SubscriptionDetailResponse {
  id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  startsAt: string; // ISO Date String
  endsAt: string;   // ISO Date String
  autoRenew: boolean;
  mpPreapprovalId?: string;
  mpExternalRef?: string;
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

export interface CancelSubscriptionResponse {
  message: string;
  subscription: SubscriptionDetailResponse;
  benefitsActiveUntil: string;
}