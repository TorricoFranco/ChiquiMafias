import type { MyTicket, MyTicketDetails, TicketMessageEntity } from "@/features/supports/types";
import { nextId } from "./ids";

export function buildTicket(overrides: Partial<MyTicket> = {}): MyTicket {
  return {
    id: nextId("ticket-0000"),
    userId: "user-1",
    category: "SUPPORT",
    subject: "No se acreditaron mis fichas",
    status: "OPEN",
    discordThreadId: null,
    createdAt: "2026-05-10T15:00:00.000Z",
    updatedAt: "2026-05-10T15:00:00.000Z",
    ...overrides,
  };
}

export function buildTicketMessage(overrides: Partial<TicketMessageEntity> = {}): TicketMessageEntity {
  return {
    id: nextId("ticket-message"),
    ticketId: "ticket-1",
    senderId: "staff-1",
    message: "Hola, ya lo estamos revisando.",
    screenshotUrl: null,
    fromDiscord: false,
    createdAt: "2026-05-10T15:30:00.000Z",
    sender: { id: "staff-1", username: "soporte_chiqui", role: "MODERATOR" },
    ...overrides,
  };
}

export function buildTicketDetails(ticket: MyTicket, messages: TicketMessageEntity[] = []): MyTicketDetails {
  return { ...ticket, messages };
}
