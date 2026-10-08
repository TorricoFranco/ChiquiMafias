import { expect, test } from "../../../fixtures/test";
import { buildGlobalStats, buildLeaderboardEntry, buildTopActiveStreakUser } from "../../../factories/stats";

test.describe("Stats y rankings", () => {
  test("muestra los ganadores y cambia de ranking", { tag: "@p0" }, async ({ app, page, api, session }) => {
    session.loginAs("USER");
    api.on("GET", "/stats/global", buildGlobalStats());
    api.on("GET", "/stats/top-earners", [
      buildLeaderboardEntry("el_rey", { totalCoinsWon: 90_000 }),
      buildLeaderboardEntry("segundon", { totalCoinsWon: 50_000 }),
      buildLeaderboardEntry("tercero", { totalCoinsWon: 20_000 }),
      buildLeaderboardEntry("cuarto_puesto", { totalCoinsWon: 10_000 }),
    ]);
    api.on("GET", "/stats/top-active", [buildTopActiveStreakUser("fiel_de_siempre", 120)]);

    await app.open();
    await app.goToSection("Stats");

    await expect(page.getByRole("heading", { name: /Top Ganadores/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Ganadores" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("@el_rey").first()).toBeVisible();
    await expect(page.getByText("@cuarto_puesto").first()).toBeVisible();

    await page.getByRole("button", { name: "Racha Diaria", exact: true }).click();

    await expect(page.getByRole("heading", { name: /Racha Diaria \(Check-in\)/ })).toBeVisible();
    await expect(page.getByText("@fiel_de_siempre").first()).toBeVisible();
    expect(api.lastRequest("GET", "/stats/top-active")).toBeTruthy();
  });

  // Con menos de 3 jugadores no hay podio: antes no se mostraba a nadie.
  test("un visitante ve los rankings públicos aunque haya menos de 3 jugadores", async ({ app, page, api }) => {
    api.on("GET", "/stats/global", buildGlobalStats());
    api.on("GET", "/stats/top-earners", [buildLeaderboardEntry("el_rey")]);

    await app.open();
    await app.goToSection("Stats");

    await expect(page.getByText("@el_rey").first()).toBeVisible();
    expect(api.requests("GET", "/stats/me")).toHaveLength(0);
  });
});
