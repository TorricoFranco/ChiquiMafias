import type { NotificationItem } from "@/features/notifications/type";
import { nextId } from "./ids";

export function buildNotification(overrides: Partial<NotificationItem> = {}): NotificationItem {
  return {
    id: nextId("notification"),
    title: "¡Ganaste tu apuesta!",
    message: "Cobraste 250 monedas.",
    type: "BET_WON",
    isGlobal: false,
    readAt: null,
    createdAt: "2026-05-10T18:00:00.000Z",
    referenceId: null,
    metadata: null,
    ...overrides,
  };
}
