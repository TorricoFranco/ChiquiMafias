import { expect, test } from "../../../fixtures/test";
import { buildChatMessage } from "../../../factories/chat";
import { buildInventoryItem } from "../../../factories/store";
import { ChatPanel } from "../../../pages/chat-panel";
import { acceptNextDialog } from "../../../support/dialogs";
import { buildTeam } from "../../../factories/teams";
import { GOOGLE_BUTTON_NAME } from "../../../support/third-party";
import type { SocketMock } from "../../../support/socket-io-mock";
import type { ChatMessagePayload } from "@/features/chat/socket/useChatSocket";

/** Como el ChatGateway: cada socket que se conecta recibe el historial global. */
function serveHistory(socket: SocketMock, messages: ChatMessagePayload[]) {
  socket.onConnect((_auth, ctx) => ctx.emit("global_chat_history", messages));
}

test.describe("Chat de la tribuna", () => {
  test("muestra el historial y los mensajes nuevos que llegan", { tag: "@p0" }, async ({ app, page, socket }) => {
    serveHistory(socket, [buildChatMessage({ name: "Gallina Feliz", message: "Buenas tardes tribuna" })]);
    const chat = new ChatPanel(page);
    await app.open();

    await expect(chat.message("Gallina Feliz")).toContainText("Buenas tardes tribuna");

    await socket.emit("on-message", buildChatMessage({ name: "Bostero 12", message: "¡Dale Boca!" }));
    await expect(chat.message("Bostero 12")).toContainText("¡Dale Boca!");
  });

  test("un usuario logueado envía un mensaje por el socket", { tag: ["@p0", "@mobile"] }, async ({ app, page, session, socket }) => {
    session.loginAs("USER", { username: "elmasgrande" });
    const chat = new ChatPanel(page);
    await app.open();
    await socket.waitForConnection();

    await chat.send("Hoy la rompemos");

    expect(await socket.waitForEmit("send-message")).toEqual({ body: "Hoy la rompemos", stickerId: null, useMegaphone: false });
    await expect(chat.input).toHaveValue("");
  });

  test("un visitante que quiere escribir ve el login", { tag: ["@p0", "@mobile"] }, async ({ app, page, socket }) => {
    const chat = new ChatPanel(page);
    await app.open();

    await chat.send("Hola");

    const login = page.getByRole("dialog", { name: "Iniciá sesión" });
    await expect(login).toBeVisible();
    await expect(login).toContainText("Entrá para participar en el chat.");
    expect(socket.emitted("send-message")).toHaveLength(0);
  });

  test("un visitante que entra con Google desde el chat ve su mensaje enviado y el login cerrado", { tag: "@p0" }, async ({ app, page, session }) => {
    session.allowGoogleLogin({ username: "hincha_de_siempre" });
    const chat = new ChatPanel(page);
    await app.open();

    await chat.send("Hola tribuna");
    await page.getByRole("button", { name: GOOGLE_BUTTON_NAME }).click();

    await expect(page.getByRole("dialog", { name: "Iniciá sesión" })).toBeHidden();
    await expect(chat.input).toHaveValue("");
  });

  test("un visitante que completa el perfil desde el chat ve el login cerrado", { tag: "@p0" }, async ({ app, page, session, api }) => {
    session.allowGoogleLogin({ isFirstLogin: true, username: null, team: null, teamId: null });
    const racing = buildTeam({ name: "Racing Club" });
    api.on("GET", "/teams", [racing]);
    api.on("PUT", "/users/complete-profile", () => ({
      ...session.user,
      username: "academia1903",
      isFirstLogin: false,
      termsAcceptedAt: "2026-10-08T12:00:00.000Z",
      team: { id: racing.id, name: racing.name, slug: "racing-club", badgeUrl: racing.badgeUrl },
    }));
    const chat = new ChatPanel(page);
    await app.open();

    await chat.send("Hola tribuna");
    await page.getByRole("button", { name: GOOGLE_BUTTON_NAME }).click();
    const onboarding = page.getByRole("dialog", { name: "Completá tu perfil" });
    await onboarding.getByLabel("Nombre de Usuario").fill("academia1903");
    await onboarding.getByRole("button", { name: /Seleccioná tu club/ }).click();
    await page.getByRole("dialog", { name: "Elegí tu Club" }).getByRole("button", { name: "Racing Club" }).click();
    await onboarding.getByRole("checkbox", { name: /Soy mayor de 18 años/ }).check();
    await onboarding.getByRole("button", { name: "Empezar a chatear" }).click();

    await expect(onboarding).toBeHidden();
    await expect(chat.input).toHaveValue("");
  });

  test("el mensaje se corta en 100 caracteres", async ({ app, page, session }) => {
    session.loginAs("USER");
    const chat = new ChatPanel(page);
    await app.open();

    await chat.input.fill("a".repeat(120));

    await expect(chat.input).toHaveValue("a".repeat(100));
    await expect(page.getByText("100/100")).toBeVisible();
  });

  test("un usuario silenciado no puede escribir hasta que vence el muteo", { tag: "@p0" }, async ({ app, page, api, session }) => {
    const now = new Date("2026-05-10T21:00:00-03:00");
    await page.clock.install({ time: now });
    const user = session.loginAs("USER");
    api.on("GET", "/moderation/status/:userId", { isMuted: true, timeoutUntil: now.getTime() + 60_000 });
    const chat = new ChatPanel(page);

    await app.open();

    await expect(page.getByText(/Estás silenciado\. Podrás volver a hablar en 00:\d\d/)).toBeVisible();
    await expect(chat.input).toBeDisabled();
    expect(api.lastRequest("GET", "/moderation/status/:userId")?.path).toBe(`/moderation/status/${user.id}`);

    await page.clock.fastForward("01:05");

    await expect(chat.input).toBeEnabled();
    await expect(page.getByText(/Estás silenciado/)).toBeHidden();
  });

  test("el muteo y el desmuteo llegan en vivo por el socket", async ({ app, page, session, socket }) => {
    const user = session.loginAs("USER");
    const chat = new ChatPanel(page);
    await app.open();

    await socket.emit("user-timeout", { userId: user.id, timeoutUntil: Date.now() + 15 * 60_000 });
    await expect(chat.input).toBeDisabled();
    await expect(chat.input).toHaveAttribute("placeholder", "Modo lectura...");

    await socket.emit("user-unmuted", { userId: user.id });
    await expect(chat.input).toBeEnabled();
  });

  test("si escribe demasiado rápido queda en pausa", async ({ app, page, session, socket }) => {
    session.loginAs("USER");
    const chat = new ChatPanel(page);
    await app.open();

    await socket.emit("ws-error", { code: "RATE_LIMIT", data: { retryIn: 30 } });

    await expect(page.getByText(/Estás silenciado/)).toBeVisible();
    await expect(chat.input).toBeDisabled();
  });

  test("se puede borrar un mensaje propio", async ({ app, page, session, socket }) => {
    const user = session.loginAs("USER", { username: "elmasgrande" });
    const own = buildChatMessage({ userId: user.id, name: "elmasgrande", message: "Me equivoqué de chat" });
    serveHistory(socket, [own]);
    const chat = new ChatPanel(page);
    await app.open();

    await chat.openMessageMenu("elmasgrande");
    const confirmDeletion = acceptNextDialog(page);
    await page.getByRole("button", { name: "Borrar" }).click();
    expect(await confirmDeletion).toBe("¿Estás seguro de que querés borrar este mensaje?");

    expect(await socket.waitForEmit("delete_message")).toEqual({ messageId: own.messageId });
    await socket.emit("on_message_deleted", { messageId: own.messageId });
    await expect(chat.message("elmasgrande")).toBeHidden();
  });

  test("un moderador mutea a un usuario desde el mensaje", async ({ app, page, api, session, socket }) => {
    session.loginAs("MODERATOR");
    const offender = buildChatMessage({ name: "Troll 3000", message: "spam spam spam" });
    api.on("POST", "/moderation/timeout", { status: "ok" });
    serveHistory(socket, [offender]);
    const chat = new ChatPanel(page);
    await app.open();

    await chat.openMessageMenu("Troll 3000");
    const alert = acceptNextDialog(page);
    await page.getByRole("button", { name: "Mutear (15m)" }).click();

    expect(await alert).toContain("Troll 3000 muteado por 15 minutos");
    expect(api.lastRequest("POST", "/moderation/timeout")?.body).toEqual({ userId: offender.userId, durationMinutes: 15 });
  });

  test("se puede reportar el mensaje de otro usuario", async ({ app, page, api, session, socket }) => {
    session.loginAs("USER");
    const offender = buildChatMessage({ name: "Troll 3000", message: "insulto" });
    api.on("POST", "/support/report", { id: "report-1" });
    serveHistory(socket, [offender]);
    const chat = new ChatPanel(page);
    await app.open();

    await chat.openMessageMenu("Troll 3000");
    await page.getByRole("button", { name: "Reportar" }).click();
    const report = page.getByRole("dialog", { name: "Reportar a Troll 3000" });
    await report.getByLabel("Motivo").selectOption("FRAUD");
    await report.getByLabel("Detalles (Opcional)").fill("Vende cuentas");
    const alert = acceptNextDialog(page);
    await report.getByRole("button", { name: "Enviar Reporte" }).click();

    expect(await alert).toContain("Reporte enviado correctamente");
    await expect(report).toBeHidden();
    expect(api.lastRequest("POST", "/support/report")?.body).toEqual({
      reportedId: offender.userId,
      reason: "FRAUD",
      details: 'Reportado desde el chat. Mensaje original: "insulto". Detalles del usuario: Vende cuentas',
    });
  });

  test("con megáfonos en el inventario se puede enviar un mensaje destacado", async ({ app, page, api, session, socket }) => {
    session.loginAs("USER");
    api.on("GET", "/inventory", [buildInventoryItem({ quantity: 2, item: { name: "Megáfono", type: "MEGAPHONE", assetId: "megaphone" } })]);
    const chat = new ChatPanel(page);
    await app.open();
    await socket.waitForConnection();

    await page.getByRole("button", { name: "Megáfono (2)" }).click();
    await expect(chat.input).toHaveAttribute("placeholder", "¡Mensaje prioritario! 📢");
    await chat.send("Mañana todos a la cancha");

    expect(await socket.waitForEmit("send-message")).toEqual({ body: "Mañana todos a la cancha", stickerId: null, useMegaphone: true });
  });
});
