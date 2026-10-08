import { expect, test } from "../../../fixtures/test";
import { buildNotification } from "../../../factories/notifications";

test.describe("Notificaciones", () => {
  test.beforeEach(async ({ session }) => {
    session.loginAs("USER");
  });

  test("el contador muestra las no leídas y al abrir se marcan como leídas", { tag: "@p0" }, async ({ app, page, api }) => {
    const won = buildNotification({ title: "¡Ganaste tu apuesta!", type: "BET_WON", metadata: { coins: 250 } });
    const announcement = buildNotification({ title: "Mantenimiento programado", type: "SYSTEM", isGlobal: true });
    const old = buildNotification({ title: "Bienvenido a la tribuna", readAt: "2026-05-01T12:00:00.000Z" });
    api.on("GET", "/notifications/unread-count", { unreadCount: 2 });
    api.on("GET", "/notifications", [won, announcement, old]);
    api.on("PATCH", "/notifications/read", { success: true });

    await app.open();
    const bell = app.header.getByRole("button", { name: "Notificaciones (2 sin leer)" });
    await bell.click();

    const inbox = page.getByRole("dialog", { name: "Notificaciones" });
    await expect(inbox).toContainText("¡Ganaste tu apuesta!");
    await expect(inbox).toContainText("+250 monedas");
    await expect(inbox).toContainText("Mantenimiento programado");

    const markRead = await api.waitFor("PATCH", "/notifications/read", { includePast: true });
    expect(markRead.body).toEqual({ ids: [won.id, announcement.id] });
    await expect(app.header.getByRole("button", { name: "Notificaciones", exact: true })).toBeVisible();
  });

  test("una notificación nueva llega en vivo", async ({ app, page, socket }) => {
    await app.open();
    await expect(app.header.getByRole("button", { name: "Notificaciones", exact: true })).toBeVisible();

    await socket.emit("notification", buildNotification({ title: "Tu ticket fue respondido", type: "TICKET_REPLY" }));

    await app.header.getByRole("button", { name: "Notificaciones (1 sin leer)" }).click();
    await expect(page.getByRole("dialog", { name: "Notificaciones" })).toContainText("Tu ticket fue respondido");
  });

  test("sin notificaciones muestra el buzón vacío", async ({ app, page }) => {
    await app.open();
    await app.header.getByRole("button", { name: "Notificaciones", exact: true }).click();

    await expect(page.getByRole("dialog", { name: "Notificaciones" })).toContainText("No tenés notificaciones pendientes.");
  });
});
