import type { ChatMessagePayload } from "@/features/chat/socket/useChatSocket";
import { LOCAL_IMAGE, nextId } from "./ids";

export function buildChatMessage(overrides: Partial<ChatMessagePayload> = {}): ChatMessagePayload {
  return {
    messageId: nextId("message"),
    userId: nextId("user"),
    badgeUrl: LOCAL_IMAGE,
    name: "Hincha Visitante",
    teamName: "River Plate",
    message: "¡Vamos que hoy se gana!",
    timestamp: Date.parse("2026-05-10T21:00:00.000Z"),
    stickerId: null,
    isMegaphone: false,
    tier: null,
    role: "USER",
    ...overrides,
  };
}
