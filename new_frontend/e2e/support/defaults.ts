import { buildCalendar } from "../factories/fixtures";
import { buildCheckIn, buildUserStats } from "../factories/stats";
import type { ApiMock } from "./api-mock";
import type { MockSession } from "./session";

/**
 * Respuestas válidas y vacías para lo que el layout pide en cualquier carga.
 * Cada spec pisa solo lo que le importa con `api.on(...)`.
 */
export function installDefaults(api: ApiMock, session: MockSession) {
  api.on("POST", "/subscriptions/streak/check-in", () => buildCheckIn());
  api.on("POST", "/wallet/my-balance", () => session.balance);
  api.on("GET", "/stats/me", () => buildUserStats({ userId: session.user?.id }));
  api.on("GET", "/inventory", []);
  api.on("GET", "/notifications/unread-count", { unreadCount: 0 });
  api.on("GET", "/notifications", []);
  api.on("GET", "/moderation/status/:userId", { isMuted: false, timeoutUntil: null });
  api.on("GET", "/subscriptions/plans", []);
  api.on("GET", "/bets/markets", []);
  api.on("GET", "/polls/active", []);
  api.on("GET", "/polls/rewards/pending", { count: 0, potentialCoins: 0 });
  api.on("GET", "/store", []);
  api.on("GET", "/coin-shop/packs", []);
  api.on("GET", "/teams", []);

  api.on("GET", "/fixtures/seasons/:season/calendar", (req) => buildCalendar({}, req.params.season));
  api.on("GET", "/fixtures/live-scores", []);
}
