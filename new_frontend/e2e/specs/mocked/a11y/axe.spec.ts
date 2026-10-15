import { expect, test } from "../../../fixtures/test";
import { buildMarket } from "../../../factories/bets";
import { buildOfficialPoll, buildPoll } from "../../../factories/polls";
import { buildMatchDetails, buildPreMatch } from "../../../factories/matches";
import { buildCoinPack, buildStoreItem } from "../../../factories/store";
import { mockAdminPanel } from "../../../support/admin";
import { expectNoSeriousA11yViolations } from "../../../support/axe";
import { mockLeague } from "../../../support/league";
import { ChatPanel } from "../../../pages/chat-panel";

test.describe("Accesibilidad (axe, WCAG 2.1 AA)", () => {
  test("home de un visitante", async ({ app, page }, testInfo) => {
    await app.open();
    // El log, no el input: sin sesión la barra de escritura no se renderiza.
    await expect(new ChatPanel(page).log).toBeVisible();

    await expectNoSeriousA11yViolations(page, testInfo, "home-visitante");
  });

  test("apuestas de un usuario logueado", async ({ app, page, api, session }, testInfo) => {
    session.loginAs("USER");
    const market = buildMarket();
    api.on("GET", "/bets/markets", [market]);

    await app.open();
    await app.goToSection("Apuestas");
    await expect(page.getByRole("article", { name: market.title })).toBeVisible();

    await expectNoSeriousA11yViolations(page, testInfo, "apuestas");
  });

  test("comunidad de un usuario logueado", async ({ app, page, api, session }, testInfo) => {
    session.loginAs("USER");
    // Una de la comunidad (con autor y escudo) y una oficial: las dos cards del feed.
    const poll = buildPoll({ title: "¿Quién gana el clásico?" });
    const officialPoll = buildOfficialPoll({ title: "Encuesta de la casa" });
    api.on("GET", "/polls/active", [poll, officialPoll]);

    await app.open();
    await app.goToSection("Comunidad");
    await expect(page.getByRole("article", { name: poll.title })).toBeVisible();
    await expect(page.getByRole("article", { name: officialPoll.title })).toBeVisible();

    await expectNoSeriousA11yViolations(page, testInfo, "comunidad");
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
