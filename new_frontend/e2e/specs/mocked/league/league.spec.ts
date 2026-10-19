import { expect, test } from "../../../fixtures/test";
import { buildMatchFixture } from "../../../factories/fixtures";
import { buildMatchday } from "../../../factories/league";
import { buildMatchDetails, buildPreMatch } from "../../../factories/matches";
import { BASE_URL } from "../../../support/env";
import { mockLeague } from "../../../support/league";

test.describe("Ligas: Liga Profesional", () => {
  test("muestra las posiciones y la fecha activa del torneo", { tag: "@p0" }, async ({ app, page, api, session }) => {
    session.loginAs("USER");
    mockLeague(api);

    await app.open("/?tab=ligas");

    const standings = page.getByRole("table").filter({ has: page.getByRole("columnheader", { name: "PTS" }) }).first();
    await expect(standings.getByRole("row", { name: /Boca Juniors/ })).toContainText("30");
    await expect(standings.getByRole("row", { name: /River Plate/ })).toContainText("28");
    await expect(page.getByText("FECHA 5", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Boca Juniors vs River Plate" })).toBeVisible();
  });

  test("un visitante sin sesión también ve las posiciones", async ({ app, page, api }) => {
    mockLeague(api);

    await app.open("/?tab=ligas");

    await expect(page.getByRole("row", { name: /Boca Juniors/ }).first()).toBeVisible();
  });

  test("elegir otra fecha pide esa jornada al backend", async ({ app, page, api, session }) => {
    session.loginAs("USER");
    mockLeague(api);

    await app.open("/?tab=ligas");
    await expect(page.getByRole("link", { name: "Boca Juniors vs River Plate" })).toBeVisible();

    await page.getByRole("button", { name: "Fecha 6" }).click();

    await expect(page.getByText("No hay partidos programados para esta fecha.")).toBeVisible();
    expect(api.lastRequest("GET", "/fixtures/seasons/:season/tournaments/:tournament/matchday/:matchday")?.path).toMatch(/\/matchday\/6$/);
  });

  test("tocar un partido del fixture abre su detalle", async ({ app, page, api, session }) => {
    session.loginAs("USER");
    const match = buildMatchDetails();
    mockLeague(api, { matchdays: { "5": buildMatchday("5", [buildMatchFixture({ id: match.metadata.id })]) } });
    api.on("GET", "/matches/leagues/:leagueId/seasons/:season/matches/:matchId", match);
    api.on("GET", "/matches/pre-match/:matchId", buildPreMatch());

    await app.open("/?tab=ligas");
    await page.getByRole("link", { name: "Boca Juniors vs River Plate" }).click();

    // Con `next dev`, la primera visita a la ruta interceptada la compila (varios segundos).
    await expect(page).toHaveURL(`${BASE_URL}/match/${match.metadata.id}`, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Boca Juniors" })).toBeVisible();
  });
});
