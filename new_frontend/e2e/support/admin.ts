import type { ApiMock } from "./api-mock";

/** Lo que pide el panel de administración al abrirse (pestaña Encuestas por defecto). */
export function mockAdminPanel(api: ApiMock) {
  api.on("GET", "/moderation/stats", { pendingPolls: 0, openMarkets: 0, openTickets: 0, onlineUsers: 0 });
  api.on("GET", "/polls/pending", []);
}
