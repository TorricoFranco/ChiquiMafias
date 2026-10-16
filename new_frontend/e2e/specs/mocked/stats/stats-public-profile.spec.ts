import { expect, test } from "../../../fixtures/test";
import { buildGlobalStats, buildLeaderboardEntry } from "../../../factories/stats";

test.describe("Stats: perfil público de un usuario", () => {
  test("tocar un usuario del ranking abre su perfil público del chat", { tag: "@p0" }, async ({ app, page, api, session }) => {
    session.loginAs("USER");
    const top = buildLeaderboardEntry("el_rey", { totalCoinsWon: 90_000 });
    api.on("GET", "/stats/global", buildGlobalStats());
    api.on("GET", "/stats/top-earners", [
      top,
      buildLeaderboardEntry("segundon", { totalCoinsWon: 50_000 }),
      buildLeaderboardEntry("tercero", { totalCoinsWon: 20_000 }),
    ]);
    api.on("GET", "/users/:id/public-profile", {
      id: top.userId,
      username: "el_rey",
      createdAt: "2026-01-01T00:00:00.000Z",
      currentStreak: 3,
      activeBannerId: null,
      team: { name: "Boca Juniors", badgeUrl: null },
      bettingStats: { currentWinStreak: 2, longestWinStreak: 5 },
      totalMessages: 10,
      cosmeticsCount: 1,
    });

    await app.open();
    await app.goToSection("Stats");
    await page.getByText("@el_rey").first().click();

    await expect(page.getByText("Hincha de Boca Juniors")).toBeVisible();
    // Se pide el perfil del usuario tocado, no el id de la fila de stats.
    expect(api.lastRequest("GET", "/users/:id/public-profile")?.path).toBe(`/users/${top.userId}/public-profile`);
  });
});
