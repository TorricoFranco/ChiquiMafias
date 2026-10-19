import type { Page } from "@playwright/test";
import type { AdminReport, AdminTicket, TicketStatus } from "@/features/supports/types";
import { expect, test } from "../../../fixtures/test";
import { buildAdminReport, buildAdminTicket, buildAdminTicketDetails, buildSupportPage } from "../../../factories/admin";
import { buildTicketMessage } from "../../../factories/support";
import type { AppShell } from "../../../pages/app-shell";
import type { ApiMock } from "../../../support/api-mock";
import { mockAdminPanel } from "../../../support/admin";

async function openSupportPanel(app: AppShell, page: Page, api: ApiMock) {
  mockAdminPanel(api);
  api.on("GET", "/support/admin/stats", { openTickets: 1, pendingReports: 1 });

  await app.open();
  await app.goToSection("Admin");
  await page.getByRole("tab", { name: /Soporte/ }).click();
}

test.describe("Admin: tickets de soporte", () => {
  test.beforeEach(async ({ session }) => {
    session.loginAs("MODERATOR", { username: "mod_chiqui" });
  });

  test("abre el primer ticket y responde como staff", { tag: "@p0" }, async ({ app, page, api }) => {
    const ticket = buildAdminTicket({ subject: "No se acreditaron mis fichas" });
    let details = buildAdminTicketDetails(ticket);
    api.on("GET", "/support/tickets", () => buildSupportPage([ticket]));
    api.on("GET", "/support/ticket/:id", () => details);
    api.handle("POST", "/support/ticket/:id/message", (req) => {
      const reply = buildTicketMessage({
        ticketId: ticket.id,
        message: (req.body as { message: string }).message,
        sender: { id: "mod-1", username: "mod_chiqui", role: "MODERATOR" },
      });
      details = { ...details, messages: [...(details.messages ?? []), reply] };
      return { status: 201, body: reply };
    });

    await openSupportPanel(app, page, api);

    await expect(page.getByRole("button", { name: /No se acreditaron mis fichas/ })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("Compré un pack y no me llegaron.")).toBeVisible();

    await page.getByLabel("Respuesta del soporte").fill("Ya te acreditamos las fichas, revisá tu saldo.");
    await page.getByRole("button", { name: "Enviar", exact: true }).click();

    await expect(page.getByText("Ya te acreditamos las fichas, revisá tu saldo.")).toBeVisible();
    await expect(page.getByLabel("Respuesta del soporte")).toHaveValue("");
    const request = api.lastRequest("POST", "/support/ticket/:id/message");
    expect(request?.path).toBe(`/support/ticket/${ticket.id}/message`);
    expect(request?.body).toEqual({ message: "Ya te acreditamos las fichas, revisá tu saldo." });
  });

  test("cambiar el estado se refleja en el detalle sin esperar al refresco", { tag: "@p0" }, async ({ app, page, api }) => {
    let ticket: AdminTicket = buildAdminTicket({ subject: "Apelación de suspensión", category: "APPEAL" });
    api.on("GET", "/support/tickets", () => buildSupportPage([ticket]));
    api.on("GET", "/support/ticket/:id", () => buildAdminTicketDetails(ticket));
    api.handle("PATCH", "/support/ticket/:id/status", (req) => {
      ticket = { ...ticket, status: (req.body as { status: TicketStatus }).status };
      return { body: ticket };
    });

    await openSupportPanel(app, page, api);
    const status = page.getByLabel("Estado del ticket");
    await expect(status).toHaveValue("OPEN");

    await status.selectOption("RESOLVED");

    await expect(status).toHaveValue("RESOLVED");
    await expect(page.getByRole("button", { name: /Apelación de suspensión/ })).toContainText("RESOLVED");
    expect(api.lastRequest("PATCH", "/support/ticket/:id/status")?.body).toEqual({ status: "RESOLVED" });
  });

  test("filtrar por categoría pide al backend solo esa categoría", async ({ app, page, api }) => {
    api.on("GET", "/support/tickets", (req) =>
      buildSupportPage(req.query.get("category") === "APPEAL" ? [buildAdminTicket({ subject: "Quiero volver", category: "APPEAL" })] : [buildAdminTicket()]),
    );
    api.on("GET", "/support/ticket/:id", (req) => buildAdminTicketDetails(buildAdminTicket({ id: req.params.id })));

    await openSupportPanel(app, page, api);
    await page.getByLabel("Filtrar tickets por categoría").selectOption("APPEAL");

    await expect(page.getByRole("button", { name: /Quiero volver/ })).toBeVisible();
    const request = api.lastRequest("GET", "/support/tickets");
    expect(request?.query.get("category")).toBe("APPEAL");
    expect(request?.query.get("page")).toBe("1");
  });
});

test.describe("Admin: reportes", () => {
  test.beforeEach(async ({ session }) => {
    session.loginAs("MODERATOR", { username: "mod_chiqui" });
  });

  async function openReports(app: AppShell, page: Page, api: ApiMock) {
    api.on("GET", "/support/tickets", buildSupportPage([]));
    await openSupportPanel(app, page, api);
    await page.getByRole("button", { name: /^Reportes/ }).click();
  }

  test("resolver un reporte silenciando al denunciado por 6 horas", { tag: "@p0" }, async ({ app, page, api }) => {
    let report: AdminReport = buildAdminReport();
    api.on("GET", "/support/reports", () => buildSupportPage([report]));
    api.handle("POST", "/support/report/:id/resolve", () => {
      report = { ...report, status: "RESOLVED", resolvedBy: { id: "mod-1", username: "mod_chiqui" } };
      return { status: 201, body: report };
    });

    await openReports(app, page, api);
    const card = page.getByRole("article", { name: "Reporte contra @toxico99" });
    await expect(card).toContainText("Insulta a todos en el chat del partido.");
    await card.getByRole("button", { name: "Resolver / Aplicar Sanción" }).click();

    const dialog = page.getByRole("dialog", { name: "Resolver Denuncia & Sancionar" });
    await dialog.getByRole("button", { name: "Silenciar Chat (MUTE)" }).click();
    await dialog.getByLabel("Duración del Mute (Horas):").selectOption("6");
    await dialog.getByLabel(/Justificación/).fill("Insultos reiterados en el chat");
    await dialog.getByRole("button", { name: "Aplicar Sanción" }).click();

    await expect(page.getByText("Reporte resuelto y sanción aplicada")).toBeVisible();
    await expect(dialog).toBeHidden();
    await expect(card).toContainText("Resuelto por @mod_chiqui");
    const request = api.lastRequest("POST", "/support/report/:id/resolve");
    expect(request?.path).toBe(`/support/report/${report.id}/resolve`);
    expect(request?.body).toEqual({ action: "MUTE", reason: "Insultos reiterados en el chat", durationHours: 6 });
  });

  test("si la sanción falla, el modal queda abierto con lo cargado", async ({ app, page, api }) => {
    api.on("GET", "/support/reports", buildSupportPage([buildAdminReport()]));
    api.on("POST", "/support/report/:id/resolve", { statusCode: 403, message: "No podés sancionar a alguien de tu mismo rango." }, { status: 403 });

    await openReports(app, page, api);
    await page.getByRole("article", { name: "Reporte contra @toxico99" }).getByRole("button", { name: "Resolver / Aplicar Sanción" }).click();
    const dialog = page.getByRole("dialog", { name: "Resolver Denuncia & Sancionar" });
    await dialog.getByRole("button", { name: "Banear Cuenta (BAN)" }).click();
    await dialog.getByRole("button", { name: "Aplicar Sanción" }).click();

    await api.waitFor("POST", "/support/report/:id/resolve", { includePast: true });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Banear Cuenta (BAN)" })).toHaveAttribute("aria-pressed", "true");
  });

  test("filtrar por estado pide al backend solo esos reportes", async ({ app, page, api }) => {
    api.on("GET", "/support/reports", (req) =>
      buildSupportPage(req.query.get("status") === "RESOLVED" ? [] : [buildAdminReport()]),
    );

    await openReports(app, page, api);
    await expect(page.getByRole("article", { name: "Reporte contra @toxico99" })).toBeVisible();

    await page.getByLabel("Filtrar reportes por estado").selectOption("RESOLVED");

    await expect(page.getByText("No se encontraron reportes.")).toBeVisible();
    expect(api.lastRequest("GET", "/support/reports")?.query.get("status")).toBe("RESOLVED");
  });
});
