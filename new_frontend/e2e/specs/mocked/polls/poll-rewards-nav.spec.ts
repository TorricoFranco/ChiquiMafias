import { expect, test } from "../../../fixtures/test";

// El botón Comunidad avisa cuando hay recompensas para reclamar: en la barra lateral de
// escritorio, en el aviso flotante y en la barra inferior de móvil.
test.describe("Recompensas pendientes en la navegación", () => {
  test("el botón Comunidad se resalta y pide hacer clic para reclamar", async ({ app, page, api, session }) => {
    session.loginAs("USER");
    api.on("GET", "/polls/rewards/pending", { count: 2, potentialCoins: 150 });

    await app.open();

    const community = app.sectionButton("Comunidad");
    await expect(community).toHaveCSS("outline-width", "2px");
    await expect(community).toContainText("¡Reclamá! +150 monedas");
    // El aviso visual no cambia el nombre del botón: sigue siendo "Comunidad".
    await expect(community).toHaveAccessibleName("Comunidad");
    await expect(community).toHaveAccessibleDescription("Tenés recompensas para reclamar. Entrá a Comunidad y hacé clic en Reclamar.");

    await community.click();
    await expect(page.getByText("¡Tenés recompensas sin reclamar!")).toBeVisible();
  });

  test("sin recompensas pendientes, Comunidad no se resalta", async ({ app, session }) => {
    session.loginAs("USER");

    await app.open();

    const community = app.sectionButton("Comunidad");
    await expect(community).toBeVisible();
    await expect(community).toHaveCSS("outline-style", "none");
    await expect(community).toHaveAccessibleDescription("");
  });

  test("el aviso flotante lleva a Comunidad para reclamar", async ({ app, page, api, session }) => {
    session.loginAs("USER");
    api.on("GET", "/polls/rewards/pending", { count: 1, potentialCoins: 50 });

    await app.open();
    await page.getByRole("button", { name: "¡Recompensa para reclamar!" }).click();

    await expect(page.getByText("¡Tenés recompensas sin reclamar!")).toBeVisible();
    await expect(app.sectionButton("Comunidad")).toHaveAttribute("aria-current", "page");
  });
});

test.describe("Recompensas pendientes en la barra inferior", { tag: "@mobile-only" }, () => {
  test("la pestaña Comunidad muestra ¡Reclamá! y lleva a reclamar", async ({ app, page, api, session }) => {
    session.loginAs("USER");
    api.on("GET", "/polls/rewards/pending", { count: 2, potentialCoins: 150 });

    await app.open();

    const tab = app.mobileTab("Comunidad");
    await expect(tab).toHaveCSS("outline-width", "2px");
    await expect(tab).toContainText("¡Reclamá!");
    await expect(tab).toHaveAccessibleDescription("Tenés recompensas para reclamar. Entrá a Comunidad y hacé clic en Reclamar.");

    await tab.click();
    await expect(page.getByText("¡Tenés recompensas sin reclamar!")).toBeVisible();
    await expect(tab).toHaveAttribute("aria-current", "page");
  });
});
