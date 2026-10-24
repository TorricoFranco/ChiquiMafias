import { expect, test } from "../../../fixtures/test";
import { buildCompetition, buildCopaArgentina } from "../../../factories/competitions";
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
    api.on("GET", "/matches/:matchId", match);
    api.on("GET", "/matches/pre-match/:matchId", buildPreMatch());

    await app.open("/?tab=ligas");
    await page.getByRole("link", { name: "Boca Juniors vs River Plate" }).click();

    // Con `next dev`, la primera visita a la ruta interceptada la compila (varios segundos).
    await expect(page).toHaveURL(`${BASE_URL}/match/${match.metadata.id}`, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Boca Juniors" })).toBeVisible();
  });

  test("pide los datos de la temporada actual que informa el backend", async ({ app, page, api, session }) => {
    session.loginAs("USER");
    api.on("GET", "/competitions", [buildCompetition({ season: { year: 2027, label: "2027" } })]);
    mockLeague(api);

    await app.open("/?tab=ligas");
    await expect(page.getByRole("link", { name: "Boca Juniors vs River Plate" })).toBeVisible();

    expect(api.lastRequest("GET", "/fixtures/seasons/:season/tournaments/:tournament/matchday/:matchday")?.path).toContain("/seasons/2027/");
    expect(api.lastRequest("GET", "/standings/seasons/:season")?.path).toMatch(/\/seasons\/2027$/);    await expect(page.getByRole("heading", { name: "Clasificación LPF 2027" })).toBeVisible();
  });

  test("se suma a los marcadores en vivo de la Liga por su slug", async ({ app, page, api, session, socket }) => {
    session.loginAs("USER");
    mockLeague(api);

    await app.open("/?tab=ligas");
    await expect(page.getByRole("link", { name: "Boca Juniors vs River Plate" })).toBeVisible();

    expect(await socket.waitForEmit("join_competition")).toEqual({ slug: "liga-profesional" });
    expect(api.lastRequest("GET", "/competitions/:slug/live")?.path).toMatch(/\/competitions\/liga-profesional\/live$/);
  });

  test("mientras llega el fixture de la fecha dice que está cargando y no que no hay partidos", async ({ app, page, api, session }) => {
    session.loginAs("USER");
    mockLeague(api);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const loaded = buildMatchday("5", [buildMatchFixture({ id: "m-carga" })]);
    api.on("GET", "/fixtures/seasons/:season/tournaments/:tournament/matchday/:matchday", async () => {
      await gate;
      return loaded;
    });

    await app.open("/?tab=ligas");

    await expect(page.getByRole("status").filter({ hasText: "Cargando partidos..." })).toBeVisible();
    await expect(page.getByText("No hay partidos programados para esta fecha.")).toHaveCount(0);

    release();

    await expect(page.getByRole("link", { name: "Boca Juniors vs River Plate" })).toBeVisible();
    await expect(page.getByText("Cargando partidos...")).toHaveCount(0);
  });

  test("un partido que termina deja de figurar en vivo y muestra su resultado final", { tag: "@p0" }, async ({ app, page, api, session, socket }) => {
    session.loginAs("USER");
    const match = buildMatchFixture({ id: "m-vivo", status_short: "2H", elapsed: 80, home_goals: 1, away_goals: 1, is_live: true });
    mockLeague(api, { matchdays: { "5": buildMatchday("5", [match]) } });

    await app.open("/?tab=ligas");
    const row = page.getByRole("link", { name: "Boca Juniors vs River Plate" });
    await expect(row).toContainText("ST80");
    await socket.waitForEmit("join_competition");

    // El backend manda el resultado final una última vez: el feed en vivo ya no lo trae.
    await socket.emit("on_league_update", {
      "m-vivo": { h: 2, a: 1, hp: 0, ap: 0, homeTeamId: "team-boca", awayTeamId: "team-river", status: "FT", elapsed: 90 },
    });

    await expect(row).toContainText("Finalizado");
    await expect(row).toContainText("2-1");
    await expect(row).not.toContainText("ST80");
  });

  test("un dato en vivo viejo no pisa un partido que el backend ya da por terminado", async ({ app, page, api, session, socket }) => {
    session.loginAs("USER");
    const terminado = buildMatchFixture({ id: "m-fin", status_short: "FT", elapsed: 90, home_goals: 2, away_goals: 1 });
    const enJuego = buildMatchFixture({
      id: "m-otro",
      home_team: { name: "Racing Club", logo_url: terminado.home_team.logo_url },
      away_team: { name: "Independiente", logo_url: terminado.home_team.logo_url },
    });
    mockLeague(api, { matchdays: { "5": buildMatchday("5", [terminado, enJuego]) } });

    await app.open("/?tab=ligas");
    const row = page.getByRole("link", { name: "Boca Juniors vs River Plate" });
    const otherRow = page.getByRole("link", { name: "Racing Club vs Independiente" });
    await expect(row).toContainText("Finalizado");
    await socket.waitForEmit("join_competition");

    // Los dos van en el mismo aviso: cuando el segundo se ve en vivo, el primero ya se procesó.
    await socket.emit("on_league_update", {
      "m-fin": { h: 1, a: 1, hp: 0, ap: 0, homeTeamId: "team-boca", awayTeamId: "team-river", status: "2H", elapsed: 85 },
      "m-otro": { h: 0, a: 0, hp: 0, ap: 0, homeTeamId: "team-racing", awayTeamId: "team-independiente", status: "2H", elapsed: 85 },
    });
    await expect(otherRow).toContainText("ST85");

    await expect(row).toContainText("Finalizado");
    await expect(row).toContainText("2-1");
    await expect(row).not.toContainText("ST85");
  });

  test("una competición nueva de la API aparece en el menú como en preparación", async ({ app, page, api, session }) => {
    session.loginAs("USER");
    // Sin cuadro todavía: se queda en Ligas como "en preparación".
    api.on("GET", "/competitions", [buildCompetition(), buildCopaArgentina({ hasBracket: false })]);
    mockLeague(api);

    await app.open("/?tab=ligas");
    await page.getByRole("button", { name: "Copa Argentina" }).click();

    await expect(page.getByText("Competición en Preparación")).toBeVisible();
    // Las que todavía no están en la API siguen como próximas.
    await expect(page.getByRole("button", { name: "Libertadores" })).toBeVisible();
  });

  test.describe("si no se puede cargar la temporada", () => {
    // TanStack reintenta 3 veces antes de dar error (unos 7 s).
    const ERROR_TIMEOUT = 20_000;

    test("la vista de Ligas avisa y deja reintentar", async ({ app, page, api, session }) => {
      session.loginAs("USER");
      mockLeague(api);
      let failing = true;
      api.handle("GET", "/competitions", () =>
        failing ? { status: 500, body: { statusCode: 500, message: "Error" } } : { body: [buildCompetition()] },
      );

      await app.open("/?tab=ligas");
      const alert = page.getByRole("alert").filter({ hasText: "No se pudo cargar la temporada de la Liga." });
      await expect(alert).toBeVisible({ timeout: ERROR_TIMEOUT });

      failing = false;
      await alert.getByRole("button", { name: "Reintentar" }).click();

      await expect(page.getByRole("link", { name: "Boca Juniors vs River Plate" })).toBeVisible();
      await expect(alert).toBeHidden();
    });

    test("el calendario de la home avisa y deja reintentar", async ({ app, page, api }) => {
      let failing = true;
      api.handle("GET", "/competitions", () =>
        failing ? { status: 500, body: { statusCode: 500, message: "Error" } } : { body: [buildCompetition()] },
      );

      await app.open();
      const alert = page.getByRole("alert").filter({ hasText: "No se pudo cargar el calendario." });
      await expect(alert.first()).toBeVisible({ timeout: ERROR_TIMEOUT });

      failing = false;
      await alert.first().getByRole("button", { name: "Reintentar" }).click();

      await expect(alert).toHaveCount(0);
    });
  });
});
