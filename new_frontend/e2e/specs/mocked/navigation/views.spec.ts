import { expect, test } from "../../../fixtures/test";
import { BASE_URL } from "../../../support/env";
import { mockLeague } from "../../../support/league";
import { ChatPanel } from "../../../pages/chat-panel";

test.describe("Navegación entre vistas (escritorio)", () => {
  test("el header cambia de vista, actualiza la URL y el botón atrás vuelve", { tag: "@p0" }, async ({ app, page, api }) => {
    mockLeague(api);
    const views = app.header.getByRole("navigation", { name: "Vistas" });

    await app.open();
    await expect(views.getByRole("button", { name: "SOCIAL" })).toHaveAttribute("aria-current", "page");

    await views.getByRole("button", { name: "LIGAS" }).click();
    await expect(page).toHaveURL(`${BASE_URL}/?tab=ligas`);
    await expect(page.getByRole("row", { name: /Boca Juniors/ }).first()).toBeVisible();
    await expect(views.getByRole("button", { name: "LIGAS" })).toHaveAttribute("aria-current", "page");

    await views.getByRole("button", { name: "SOCIAL" }).click();
    await expect(page).toHaveURL(`${BASE_URL}/?tab=social`);
    await expect(views.getByRole("button", { name: "SOCIAL" })).toHaveAttribute("aria-current", "page");
    // CALENDARIO no tiene botón: la vista todavía no está lista.
    await expect(views.getByRole("button", { name: "CALENDARIO" })).toHaveCount(0);

    await page.goBack();
    await expect(page).toHaveURL(`${BASE_URL}/?tab=ligas`);
    await expect(page.getByRole("row", { name: /Boca Juniors/ }).first()).toBeVisible();
    await expect(views.getByRole("button", { name: "LIGAS" })).toHaveAttribute("aria-current", "page");
  });

  test("entrar con ?tab=ligas abre esa vista directamente", async ({ app, page, api }) => {
    mockLeague(api);

    await app.open("/?tab=ligas");

    await expect(app.header.getByRole("navigation", { name: "Vistas" }).getByRole("button", { name: "LIGAS" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("row", { name: /Boca Juniors/ }).first()).toBeVisible();
    await expect(new ChatPanel(page).log).toBeHidden();
  });

  test("un ?tab de una vista que ya no existe abre Social", async ({ app, page }) => {
    await app.open("/?tab=calendario");

    await expect(app.header.getByRole("navigation", { name: "Vistas" }).getByRole("button", { name: "SOCIAL" })).toHaveAttribute("aria-current", "page");
    await expect(new ChatPanel(page).log).toBeVisible();
  });

  test("las secciones de la barra lateral se marcan como actuales", async ({ app, session }) => {
    session.loginAs("USER");

    await app.open();
    await expect(app.sectionButton("Chat")).toHaveAttribute("aria-current", "page");

    await app.goToSection("Tienda");

    await expect(app.sectionButton("Tienda")).toHaveAttribute("aria-current", "page");
    await expect(app.sectionButton("Chat")).not.toHaveAttribute("aria-current");
  });
});
