import { expect, test } from "../../../fixtures/test";
import { mockAdminPanel } from "../../../support/admin";

test.describe("Acceso al panel de administración", () => {
  test("un hincha común no ve la sección Admin", { tag: "@p0" }, async ({ app, session }) => {
    session.loginAs("USER");

    await app.open();

    await expect(app.sectionButton("Chat")).toBeVisible();
    await expect(app.sectionButton("Admin")).toBeHidden();
  });

  test("un moderador entra pero apuestas y usuarios quedan bloqueados", { tag: "@p0" }, async ({ app, page, api, session }) => {
    session.loginAs("MODERATOR");
    mockAdminPanel(api);

    await app.open();
    await app.goToSection("Admin");

    await expect(page.getByRole("tab", { name: /Encuestas/ })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tab", { name: /Soporte/ })).toBeEnabled();
    await expect(page.getByRole("tab", { name: /Apuestas/ })).toBeDisabled();
    await expect(page.getByRole("tab", { name: /Usuarios/ })).toBeDisabled();
    await expect(page.getByRole("tab", { name: /Apuestas/ })).toContainText("Solo Admin");
  });

  for (const role of ["ADMIN", "PRESIDENT"] as const) {
    test(`un ${role} tiene todas las secciones habilitadas`, async ({ app, page, api, session }) => {
      session.loginAs(role);
      mockAdminPanel(api);

      await app.open();
      await app.goToSection("Admin");

      for (const tab of [/Encuestas/, /Apuestas/, /Soporte/, /Usuarios/]) {
        await expect(page.getByRole("tab", { name: tab })).toBeEnabled();
      }
    });
  }
});
