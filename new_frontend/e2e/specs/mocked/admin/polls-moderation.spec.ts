import type { AdminPollItem } from "@/features/polls/types";
import { expect, test } from "../../../fixtures/test";
import { buildPoll } from "../../../factories/polls";
import { mockAdminPanel } from "../../../support/admin";

function buildPendingPoll(overrides: Partial<AdminPollItem> = {}): AdminPollItem {
  return { ...buildPoll({ status: "PENDING", title: "¿Vuelve Riquelme a jugar?" }), ...overrides };
}

test.describe("Admin: moderación de encuestas", () => {
  test.beforeEach(async ({ api, session }) => {
    session.loginAs("MODERATOR");
    mockAdminPanel(api);
  });

  test("aprobar con las fechas por defecto la publica desde ahora (hora local)", { tag: "@p0" }, async ({ app, page, api }) => {
    // 18:00 en Buenos Aires = 21:00 UTC. El timezone del navegador lo fija la config (America/Argentina/Buenos_Aires).
    await page.clock.install({ time: new Date("2026-05-10T21:00:00.000Z") });
    const pending = buildPendingPoll();
    api.on("GET", "/polls/pending", [pending]);
    api.on("PATCH", "/polls/:id/approve", { ...pending, status: "ACTIVE" });

    await app.open();
    await app.goToSection("Admin");
    await page.getByRole("article", { name: pending.title }).getByRole("button", { name: "Aprobar" }).click();
    const modal = page.getByRole("dialog", { name: "Aprobar Encuesta" });

    await expect(modal.getByLabel("Inicio (startsAt)")).toHaveValue("2026-05-10T18:00");
    await modal.getByRole("button", { name: "Confirmar y Publicar" }).click();

    await expect(page.getByText("Encuesta aprobada exitosamente")).toBeVisible();
    expect(api.lastRequest("PATCH", "/polls/:id/approve")?.body).toEqual({
      startsAt: "2026-05-10T21:00:00.000Z",
      endsAt: "2026-05-11T21:00:00.000Z",
    });
  });

  test("rechazar una propuesta avisa que se reembolsa el ticket", async ({ app, page, api }) => {
    const pending = buildPendingPoll({ title: "Encuesta con insultos" });
    api.on("GET", "/polls/pending", [pending]);
    api.on("PATCH", "/polls/:id/reject", { message: "Encuesta rechazada" });

    await app.open();
    await app.goToSection("Admin");
    await page.getByRole("article", { name: pending.title }).getByRole("button", { name: "Rechazar" }).click();

    await expect(page.getByText("Encuesta rechazada. Se reembolsará al usuario.")).toBeVisible();
    expect(api.lastRequest("PATCH", "/polls/:id/reject")?.path).toBe(`/polls/${pending.id}/reject`);
  });

  test("sin propuestas muestra que no hay pendientes", async ({ app, page }) => {
    await app.open();
    await app.goToSection("Admin");

    await expect(page.getByRole("heading", { name: "¡No hay encuestas pendientes!" })).toBeVisible();
  });
});
