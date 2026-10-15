import { expect, test } from "../../../fixtures/test";
import { buildInventoryItem } from "../../../factories/store";

// La cache de recompensas y de inventario va por usuario: al cerrar sesión no deben quedar en pantalla
// los datos de la cuenta anterior. TanStack devuelve la cache aunque la query esté deshabilitada, así que
// además se verifica que el visitante no vuelva a pedir esos datos (el gate `enabled: !!userId`).
test.describe("Al cerrar sesión no quedan datos de la cuenta anterior", () => {
  test("el aviso de recompensas desaparece para el visitante", { tag: ["@p0", "@mobile"] }, async ({ app, page, api, session }) => {
    session.loginAs("USER");
    api.on("GET", "/polls/rewards/pending", { count: 2, potentialCoins: 150 });

    await app.open();
    const notice = page.getByRole("button", { name: "¡Recompensa para reclamar!" });
    await expect(notice).toBeVisible();

    await app.goToSection("Ajustes");
    const requestsBeforeLogout = api.requests("GET", "/polls/rewards/pending").length;
    await page.getByRole("button", { name: "Cerrar Sesión" }).click();

    await expect(app.loginButton).toBeVisible();
    await expect(notice).toHaveCount(0);
    expect(api.requests("GET", "/polls/rewards/pending")).toHaveLength(requestsBeforeLogout);
  });

  test("el botón Crear encuesta queda deshabilitado para el visitante", { tag: ["@p0", "@mobile"] }, async ({ app, page, api, session }) => {
    session.loginAs("USER");
    api.on("GET", "/inventory", [buildInventoryItem({ item: { name: "Ticket Encuesta", type: "CUSTOM_POLL", assetId: "custom-poll" } })]);

    await app.open();
    await app.goToSection("Comunidad");
    await expect(page.getByRole("button", { name: "Crear encuesta" })).toBeEnabled();

    await app.goToSection("Ajustes");
    const requestsBeforeLogout = api.requests("GET", "/inventory").length;
    await page.getByRole("button", { name: "Cerrar Sesión" }).click();
    await expect(app.loginButton).toBeVisible();

    // En móvil el menú sigue abierto tras cerrar sesión; su enlace a Comunidad lleva a la vista igual que en escritorio.
    await app.sectionButton("Comunidad").click();
    await expect(page.getByRole("button", { name: "Crear encuesta" })).toBeDisabled();
    expect(api.requests("GET", "/inventory")).toHaveLength(requestsBeforeLogout);
  });
});
