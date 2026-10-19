import type { MyTicket, TicketMessageEntity } from "@/features/supports/types";
import { expect, test } from "../../../fixtures/test";
import { buildTicket, buildTicketDetails, buildTicketMessage } from "../../../factories/support";
import type { ApiMock } from "../../../support/api-mock";

/** Backend de soporte en memoria: lo que un usuario baneado puede usar para apelar. */
function mockAppeals(api: ApiMock, userId: string, initial: { ticket: MyTicket; messages: TicketMessageEntity[] }[] = []) {
  const appeals = [...initial];

  api.on("GET", "/support/my-tickets", () => appeals.map((appeal) => appeal.ticket));
  api.on("GET", "/support/my-tickets/:id", (req) => {
    const appeal = appeals.find(({ ticket }) => ticket.id === req.params.id);
    return appeal ? buildTicketDetails(appeal.ticket, appeal.messages) : null;
  });
  api.handle("POST", "/support/ticket", (req) => {
    const body = req.body as { category: MyTicket["category"]; subject: string; message: string };
    const ticket = buildTicket({ userId, category: body.category, subject: body.subject });
    appeals.unshift({ ticket, messages: [buildTicketMessage({ ticketId: ticket.id, senderId: userId, message: body.message })] });
    return { status: 201, body: ticket };
  });
  api.handle("POST", "/support/ticket/:id/message", (req) => {
    const appeal = appeals.find(({ ticket }) => ticket.id === req.params.id);
    const message = buildTicketMessage({ senderId: userId, message: (req.body as { message: string }).message });
    appeal?.messages.push(message);
    return { status: 201, body: message };
  });
}

test.describe("Usuario suspendido", () => {
  test("ve la suspensión y puede enviar una apelación", { tag: ["@p0", "@mobile"] }, async ({ page, api, session }) => {
    const user = session.loginAsBanned();
    mockAppeals(api, user.id);

    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Acceso Suspendido" })).toBeVisible();
    await expect(page.getByRole("banner")).toBeHidden();

    await page.getByLabel("Contanos por qué creés que la suspensión es un error").fill("No insulté a nadie, fue un malentendido en el chat.");
    await page.getByRole("button", { name: "Enviar apelación" }).click();

    await expect(page.getByRole("heading", { name: "Tu apelación" })).toBeVisible();
    await expect(page.getByText("Enviada, esperando revisión")).toBeVisible();
    await expect(page.getByRole("list", { name: "Conversación con el staff" })).toContainText("No insulté a nadie");
    expect(api.lastRequest("POST", "/support/ticket")?.body).toEqual({
      category: "APPEAL",
      subject: "Apelación de suspensión de cuenta",
      message: "No insulté a nadie, fue un malentendido en el chat.",
    });
  });

  test("con una apelación en curso ve la respuesta del staff y puede contestar", { tag: "@p0" }, async ({ page, api, session }) => {
    const user = session.loginAsBanned();
    const appeal = buildTicket({ userId: user.id, category: "APPEAL", status: "UNDER_REVIEW" });
    mockAppeals(api, user.id, [
      {
        ticket: appeal,
        messages: [
          buildTicketMessage({ senderId: user.id, message: "Fue un error." }),
          buildTicketMessage({ message: "Estamos revisando el historial del chat." }),
        ],
      },
    ]);

    await page.goto("/");

    const thread = page.getByRole("list", { name: "Conversación con el staff" });
    await expect(page.getByText("En revisión por el staff")).toBeVisible();
    await expect(thread).toContainText("Estamos revisando el historial del chat.");

    await page.getByLabel("Agregar información a tu apelación").fill("Les dejo el horario: 21:15 del sábado.");
    await page.getByRole("button", { name: "Enviar respuesta" }).click();

    await expect(thread).toContainText("Les dejo el horario: 21:15 del sábado.");
    expect(api.lastRequest("POST", "/support/ticket/:id/message")?.path).toBe(`/support/ticket/${appeal.id}/message`);
  });

  test("si su apelación anterior se cerró puede enviar una nueva", async ({ page, api, session }) => {
    const user = session.loginAsBanned();
    mockAppeals(api, user.id, [{ ticket: buildTicket({ userId: user.id, category: "APPEAL", status: "CLOSED" }), messages: [] }]);

    await page.goto("/");

    await expect(page.getByText("Tu apelación anterior ya fue cerrada por el staff. Podés enviar una nueva.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Enviar apelación" })).toBeVisible();
  });

  test("si la suspensión llega con la sesión abierta, el primer 403 lleva a la apelación", { tag: "@p0" }, async ({ page, api, session }) => {
    const user = session.loginAs("USER");
    session.banAfterRefresh();
    mockAppeals(api, user.id);

    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Acceso Suspendido" })).toBeVisible();
    expect(session.user?.status, "el refresh la seguía informando activa").toBe("ACTIVE");
  });

  test("puede salir de la cuenta", async ({ app, page, api, session }) => {
    const user = session.loginAsBanned();
    mockAppeals(api, user.id);

    await page.goto("/");
    await page.getByRole("button", { name: "Salir de la cuenta" }).click();

    await expect(app.loginButton).toBeVisible();
  });
});
