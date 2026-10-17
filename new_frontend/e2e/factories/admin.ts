import type {
  PriceChangeLogEntry,
  PricingActiveDiscount,
  PricingCoinPack,
  PricingOverview,
  PricingStoreItem,
  PricingSubscriptionPlan,
} from "@/features/admin/types";
import type { AdminReport, AdminTicket, PaginatedResponse, TicketMessageEntity } from "@/features/supports/types";
import type { PaginatedUsersResponse, UserEntity } from "@/features/users/types";
import { SubscriptionTier } from "@/features/subscriptions/types";
import { nextId } from "./ids";
import { buildTicketMessage } from "./support";

export function buildAdminUser(overrides: Partial<UserEntity> = {}): UserEntity {
  const id = overrides.id ?? nextId("user-admin-list");
  return {
    id,
    name: "Juan Pérez",
    email: `${id}@chiquimafias.test`,
    username: "juancito",
    isFirstLogin: false,
    termsAcceptedAt: "2026-01-15T12:00:00.000Z",
    termsVersion: "2026-10",
    status: "ACTIVE",
    mutedUntil: null,
    role: "USER",
    activeSubscriptionTier: null,
    currentStreak: 3,
    lastCheckIn: null,
    streakRewardClaimed: false,
    activeNameColorId: null,
    activeBannerId: null,
    activeChatBubbleId: null,
    createdAt: "2026-01-10T12:00:00.000Z",
    teamId: null,
    team: null,
    wallet: { balance: 1000 },
    ...overrides,
  };
}

/** Respuesta de `GET /users` (la paginación de usuarios usa `totalPages`). */
export function buildUsersPage(users: UserEntity[]): PaginatedUsersResponse {
  return { data: users, meta: { total: users.length, page: 1, limit: 20, totalPages: 1 } };
}

/** Respuesta paginada de soporte (`GET /support/tickets`, `GET /support/reports`). */
export function buildSupportPage<T>(data: T[]): PaginatedResponse<T> {
  return { data, meta: { total: data.length, page: 1, limit: 10, lastPage: 1 } };
}

export function buildAdminTicket(overrides: Partial<AdminTicket> = {}): AdminTicket {
  return {
    id: nextId("ticket-admin-0000"),
    userId: "user-1",
    category: "SUPPORT",
    subject: "No se acreditaron mis fichas",
    status: "OPEN",
    discordThreadId: null,
    createdAt: "2026-05-10T15:00:00.000Z",
    updatedAt: "2026-05-10T15:00:00.000Z",
    user: { id: "user-1", username: "hincha_fiel", role: "USER" },
    ...overrides,
  };
}

/** Detalle de `GET /support/ticket/:id`: el ticket con su conversación. */
export function buildAdminTicketDetails(ticket: AdminTicket, messages: TicketMessageEntity[] = []): AdminTicket {
  return {
    ...ticket,
    messages: messages.length
      ? messages
      : [buildTicketMessage({ ticketId: ticket.id, senderId: ticket.userId, message: "Compré un pack y no me llegaron.", sender: { id: ticket.userId, username: ticket.user.username, role: "USER" } })],
  };
}

export function buildPricingCoinPack(overrides: Partial<PricingCoinPack> = {}): PricingCoinPack {
  return {
    id: nextId("pack"),
    name: "Pack Hincha",
    coinsAmount: 1000,
    bonusCoins: 0,
    priceARS: 1500,
    isActive: true,
    isPopular: false,
    ...overrides,
  };
}

export function buildPricingStoreItem(overrides: Partial<PricingStoreItem> = {}): PricingStoreItem {
  return {
    id: nextId("item"),
    name: "Banner Bombonera",
    type: "BANNER",
    assetId: "bombonera",
    price: 2000,
    isActive: true,
    isPurchasable: true,
    ...overrides,
  };
}

export function buildPricingPlan(overrides: Partial<PricingSubscriptionPlan> = {}): PricingSubscriptionPlan {
  return {
    id: nextId("plan"),
    tier: SubscriptionTier.TIER_2,
    name: "Plateísta",
    basePriceARS: 4000,
    isActive: true,
    ...overrides,
  };
}

export function buildPricingDiscount(overrides: Partial<PricingActiveDiscount> = {}): PricingActiveDiscount {
  return {
    id: nextId("discount"),
    name: "Promo de la fecha",
    percentage: 20,
    scope: "ALL",
    targetType: null,
    targetItemId: null,
    endDate: "2026-12-31T23:59:59.000Z",
    ...overrides,
  };
}

export function buildPriceChangeLogEntry(overrides: Partial<PriceChangeLogEntry> = {}): PriceChangeLogEntry {
  return {
    id: nextId("price-log"),
    entity: "COIN_PACK",
    entityId: "pack-1",
    entityName: "Pack Hincha",
    oldPrice: 1500,
    newPrice: 2500,
    currency: "ARS",
    changedByUsername: "elpresidente",
    createdAt: "2026-05-10T12:00:00.000Z",
    ...overrides,
  };
}

/** Respuesta de `GET /pricing/admin` (ya desenvuelta del `{ status, message, data }`). */
export function buildPricingOverview(overrides: Partial<PricingOverview> = {}): PricingOverview {
  return {
    coinPacks: [buildPricingCoinPack()],
    storeItems: [buildPricingStoreItem()],
    subscriptionPlans: [buildPricingPlan()],
    activeDiscounts: [],
    recentChanges: [],
    coinValueARS: 0.5,
    ...overrides,
  };
}

export function buildAdminReport(overrides: Partial<AdminReport> = {}): AdminReport {
  return {
    id: nextId("report"),
    reporterId: "user-reporter",
    reportedId: "user-reported",
    commentId: null,
    pollId: null,
    reason: "TOXIC_CHAT",
    details: "Insulta a todos en el chat del partido.",
    status: "PENDING",
    discordMessageId: null,
    createdAt: "2026-05-10T18:00:00.000Z",
    resolvedById: null,
    reporter: { id: "user-reporter", username: "denunciante", email: "denunciante@chiquimafias.test" },
    reported: { id: "user-reported", username: "toxico99", email: "toxico99@chiquimafias.test" },
    resolvedBy: null,
    comment: null,
    poll: null,
    ...overrides,
  };
}
