import type { Page } from "@playwright/test";
import { expect, test } from "../../../fixtures/test";
import { buildAdminUser, buildUsersPage } from "../../../factories/admin";
import type { AppShell } from "../../../pages/app-shell";
import type { ApiMock } from "../../../support/api-mock";
import { mockAdminPanel } from "../../../support/admin";

async function openUsersPanel(app: AppShell, page: Page, api: ApiMock) {
  mockAdminPanel(api);
  api.on("GET", "/users/online", []);
  api.on("GET", "/moderation/muted-users", []);

  await app.open();
  await app.goToSection("Admin");
  await page.getByRole("tab", { name: /Usuarios/ }).click();
}

const userRow = (page: Page, username: string) => page.getByRole("row", { name: new RegExp(`@${username}\\b`) });

test.describe("Admin: usuarios", () => {
  test("banear y desbanear una cuenta", { tag: "@p0" }, async ({ app, page, api, session }) => {
    session.loginAs("ADMIN");
    let target = buildAdminUser({ username: "toxico99" });
    api.on("GET", "/users", () => buildUsersPage([target]));
    api.handle("PATCH", "/users/:id/ban", () => {
      target = { ...target, status: "BANNED" };
      return { body: { message: "Usuario baneado correctamente de la plataforma." } };
    });
    api.handle("PATCH", "/users/:id/unban", () => {
      target = { ...target, status: "ACTIVE" };
      return { body: { message: "Usuario desbaneado correctamente." } };
    });

    await openUsersPanel(app, page, api);
    const row = userRow(page, "toxico99");
    await row.getByRole("button", { name: "Banear Cuenta" }).click();

    await expect(page.getByText("Usuario baneado de la plataforma")).toBeVisible();
    await expect(row.getByRole("cell", { name: "BANNED" })).toBeVisible();
    expect(api.lastRequest("PATCH", "/users/:id/ban")?.path).toBe(`/users/${target.id}/ban`);

    await row.getByRole("button", { name: "Desbanear Cuenta" }).click();

    await expect(page.getByText("Baneo revocado. Usuario activo nuevamente")).toBeVisible();
    await expect(row.getByRole("button", { name: "Banear Cuenta" })).toBeVisible();
  });

  test("cambiar el rol de un usuario", async ({ app, page, api, session }) => {
    session.loginAs("ADMIN");
    const target = buildAdminUser({ username: "futuro_mod" });
    api.on("GET", "/users", buildUsersPage([target]));
    api.on("PATCH", "/users/:id/role", { message: "Rol actualizado" });

    await openUsersPanel(app, page, api);
    await userRow(page, "futuro_mod").getByRole("button", { name: "Cambiar rol" }).click();
    const dialog = page.getByRole("dialog", { name: "Cambiar Rol de Sistema" });
    await dialog.getByRole("radio", { name: /^MODERATOR/ }).check();
    await dialog.getByRole("button", { name: "Guardar Rol" }).click();

    await expect(page.getByText("Rol del usuario actualizado a [MODERATOR]")).toBeVisible();
    await expect(dialog).toBeHidden();
    const request = api.lastRequest("PATCH", "/users/:id/role");
    expect(request?.path).toBe(`/users/${target.id}/role`);
    expect(request?.body).toEqual({ role: "MODERATOR" });
  });

  test("silenciar el chat de un usuario por una hora", async ({ app, page, api, session }) => {
    session.loginAs("ADMIN");
    let target = buildAdminUser({ username: "gritón" });
    api.on("GET", "/users", () => buildUsersPage([target]));
    api.handle("POST", "/moderation/timeout", () => {
      target = { ...target, mutedUntil: "2026-05-10T19:00:00.000Z" };
      return { status: 201, body: { message: "Usuario silenciado" } };
    });

    await openUsersPanel(app, page, api);
    const row = userRow(page, "gritón");
    await row.getByRole("button", { name: "Silenciar Chat" }).click();
    const dialog = page.getByRole("dialog", { name: "Silenciar Usuario en Tribuna" });
    await dialog.getByRole("button", { name: "1 Hora" }).click();
    await expect(dialog.getByRole("button", { name: "1 Hora" })).toHaveAttribute("aria-pressed", "true");
    await dialog.getByRole("button", { name: "Aplicar Silencio" }).click();

    await expect(page.getByText("Usuario silenciado en el chat por 60 minutos")).toBeVisible();
    await expect(row.getByRole("button", { name: /^Desmutear/ })).toBeVisible();
    expect(api.lastRequest("POST", "/moderation/timeout")?.body).toEqual({ userId: target.id, durationMinutes: 60 });
  });

  test("el presidente acredita monedas a un usuario", { tag: "@p0" }, async ({ app, page, api, session }) => {
    session.loginAs("PRESIDENT");
    const target = buildAdminUser({ username: "juancito" });
    api.on("GET", "/users", buildUsersPage([target]));
    api.on("POST", "/wallet/admin/add-coins", { id: "wallet-1", userId: target.id, balance: 1500 }, { status: 201 });

    await openUsersPanel(app, page, api);
    await userRow(page, "juancito").getByRole("button", { name: "Recargar saldo / monedas" }).click();
    const dialog = page.getByRole("dialog", { name: "Recargar Monedas" });
    await dialog.getByLabel("Monto").fill("500");
    await dialog.getByLabel("Descripción").fill("Premio por el torneo de pronósticos");
    await dialog.getByRole("button", { name: "Acreditar" }).click();

    await expect(page.getByText("Se acreditaron 500 monedas a @juancito")).toBeVisible();
    await expect(dialog).toBeHidden();
    expect(api.lastRequest("POST", "/wallet/admin/add-coins")?.body).toEqual({
      userId: target.id,
      amount: 500,
      description: "Premio por el torneo de pronósticos",
    });
  });

  test("si el backend rechaza la recarga, el modal muestra el motivo y queda abierto", async ({ app, page, api, session }) => {
    session.loginAs("PRESIDENT");
    api.on("GET", "/users", buildUsersPage([buildAdminUser({ username: "millonario" })]));
    api.on("POST", "/wallet/admin/add-coins", { statusCode: 400, message: "El saldo superaría el tope de 50000 monedas" }, { status: 400 });

    await openUsersPanel(app, page, api);
    await userRow(page, "millonario").getByRole("button", { name: "Recargar saldo / monedas" }).click();
    const dialog = page.getByRole("dialog", { name: "Recargar Monedas" });
    await dialog.getByRole("button", { name: "Acreditar" }).click();

    await expect(dialog.getByText("El saldo superaría el tope de 50000 monedas")).toBeVisible();
  });

  test("cada columna de la tabla tiene su encabezado", async ({ app, page, api, session }) => {
    session.loginAs("ADMIN");
    api.on("GET", "/users", buildUsersPage([buildAdminUser({ username: "contado" })]));

    await openUsersPanel(app, page, api);

    await expect(userRow(page, "contado").getByRole("cell")).toHaveCount(7);
    await expect(page.getByRole("columnheader")).toHaveCount(7);
    await expect(page.getByRole("columnheader", { name: "Suscripción" })).toBeVisible();
  });
});
