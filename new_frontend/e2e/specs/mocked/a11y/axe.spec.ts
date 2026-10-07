import { expect, test } from "../../../fixtures/test";
import { buildMarket } from "../../../factories/bets";
import { buildMatchDetails, buildPreMatch } from "../../../factories/matches";
import { buildCoinPack, buildStoreItem } from "../../../factories/store";
import { mockAdminPanel } from "../../../support/admin";
import { expectNoSeriousA11yViolations } from "../../../support/axe";
import { mockLeague } from "../../../support/league";
import { ChatPanel } from "../../../pages/chat-panel";

test.describe("Accesibilidad (axe, WCAG 2.1 AA)", () => {
  test("home de un visitante", async ({ app, page }, testInfo) => {
    await app.open();
    await expect(new ChatPanel(page).input).toBeVisible();

    await expectNoSeriousA11yViolations(page, testInfo, "home-visitante");
  });

  test("pronósticos de un usuario logueado", async ({ app, page, api, session }, testInfo) => {
    session.loginAs("USER");
    const market = buildMarket();
    api.on("GET", "/bets/markets", [market]);

    await app.open();
    await app.goToSection("Pronósticos");
    await expect(page.getByRole("article", { name: market.title })).toBeVisible();

    await expectNoSeriousA11yViolations(page, testInfo, "pronosticos");
  });

  test("tienda", async ({ app, page, api, session }, testInfo) => {
    session.loginAs("USER");
    api.on("GET", "/store", [buildStoreItem({ name: "Banner Bombonera" })]);
    api.on("GET", "/coin-shop/packs", [buildCoinPack()]);

    await app.open();
    await app.goToSection("Tienda");
    await expect(page.getByRole("tab", { name: /Packs Chiqui-Coins/ })).toBeVisible();

    await expectNoSeriousA11yViolations(page, testInfo, "tienda");
  });

  test("detalle de partido", async ({ page, api }, testInfo) => {
    const match = buildMatchDetails();
    api.on("GET", "/matches/leagues/:leagueId/seasons/:season/matches/:matchId", match);
    api.on("GET", "/matches/pre-match/:matchId", buildPreMatch());

    await page.goto(`/match/${match.metadata.id}`);
    await expect(page.getByRole("heading", { name: "Boca Juniors" })).toBeVisible();

    await expectNoSeriousA11yViolations(page, testInfo, "partido");
  });

  test("ligas", async ({ app, page, api }, testInfo) => {
    mockLeague(api);

    await app.open("/?tab=ligas");
    await expect(page.getByRole("row", { name: /Boca Juniors/ }).first()).toBeVisible();

    await expectNoSeriousA11yViolations(page, testInfo, "ligas");
  });

  test("panel de administración", async ({ app, page, api, session }, testInfo) => {
    session.loginAs("ADMIN");
    mockAdminPanel(api);

    await app.open();
    await app.goToSection("Admin");
    await expect(page.getByRole("tablist", { name: "Secciones de administración" })).toBeVisible();

    await expectNoSeriousA11yViolations(page, testInfo, "admin");
  });
});
