import { expect, test } from "../../../fixtures/test";
import { buildCompetition, buildCopaArgentina } from "../../../factories/competitions";
import { buildMatchFixture } from "../../../factories/fixtures";
import type { FullStandingsResponse } from "@/features/standings/types";
import { buildBracketTeam, buildMatchday, buildPendingGroup, buildPlayoffBrackets, buildStandingRow } from "../../../factories/league";
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

  test("en el celular el cuadro de playoffs muestra los dos lados enteros y la final en su lugar", { tag: "@mobile-only" }, async ({ app, page, api, session }) => {
    session.loginAs("USER");
    mockLeague(api, {
      brackets: buildPlayoffBrackets({
        "octavos:left:0": { home_team: buildBracketTeam("Instituto"), away_team: buildBracketTeam("Huracan") },
        "octavos:right:0": { home_team: buildBracketTeam("Rosario Central"), away_team: buildBracketTeam("Independiente") },
        "semifinal:left:0": { home_team: buildBracketTeam("Talleres"), away_team: buildBracketTeam("Lanus") },
        "final:center:0": { home_team: buildBracketTeam("Boca Juniors"), away_team: buildBracketTeam("River Plate") },
      }),
    });

    await app.open("/?tab=ligas");
    await page.getByRole("button", { name: "Ver llaves playoffs" }).click();

    // Antes el árbol de escritorio desbordaba: los octavos de la izquierda quedaban fuera de la pantalla.
    const octavos = page.getByRole("region", { name: "Octavos de final" });
    await expect(octavos.getByText("Instituto")).toBeInViewport({ ratio: 1 });
    await expect(octavos.getByText("Rosario Central")).toBeInViewport({ ratio: 1 });

    // 'semifinal' también contiene 'final': la primera semi no puede ocupar el lugar de la final.
    const final = page.getByRole("region", { name: "Final", exact: true });
    await expect(final.getByText("Boca Juniors")).toBeVisible();
    await expect(final.getByText("Talleres")).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Semifinales" }).getByText("Talleres")).toBeVisible();
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

  test("en el cuadro de playoffs solo queda resaltado el ganador de cada cruce terminado", { tag: "@mobile" }, async ({ app, page, api, session }) => {
    session.loginAs("USER");
    // Como lo manda el backend: los equipos sin id y sin `winnerTeamId`, el ganador sale del resultado.
    mockLeague(api, {
      brackets: buildPlayoffBrackets({
        "octavos:left:0": { home_team: buildBracketTeam("Instituto"), away_team: buildBracketTeam("Huracan"), home_goals: 2, away_goals: 1, status_short: "FT" },
        "octavos:left:1": {
          home_team: buildBracketTeam("Rosario Central"),
          away_team: buildBracketTeam("Independiente"),
          home_goals: 1,
          away_goals: 1,
          home_penalty_goals: 3,
          away_penalty_goals: 4,
          status_short: "PEN",
        },
        // Terminado sin los penales cargados: no hay de dónde sacar al ganador.
        "octavos:left:2": { home_team: buildBracketTeam("Belgrano"), away_team: buildBracketTeam("Tigre"), home_goals: 0, away_goals: 0, status_short: "PEN" },
        "octavos:right:0": { home_team: buildBracketTeam("Talleres"), away_team: buildBracketTeam("Lanus") },
      }),
    });

    await app.open("/?tab=ligas");
    await page.getByRole("button", { name: "VER LLAVES PLAYOFFS", exact: true }).click();

    // Solo los visibles: el cuadro puede tener un armado para el celular y otro para escritorio.
    const winner = (team: string) => page.getByText(`${team} (ganador)`).filter({ visible: true });
    await expect(winner("Instituto")).toBeVisible();
    await expect(winner("Independiente")).toBeVisible();
    await expect(winner("Huracan")).toHaveCount(0);
    await expect(winner("Rosario Central")).toHaveCount(0);
    // Ni el cruce por penales sin cargar ni el que todavía no se jugó tienen ganador.
    await expect(page.getByText("(ganador)").filter({ visible: true })).toHaveCount(2);
  });

  test("en el cuadro de playoffs los cruces sin definir no figuran como programados", { tag: "@mobile" }, async ({ app, page, api, session }) => {
    session.loginAs("USER");
    mockLeague(api, {
      brackets: buildPlayoffBrackets({
        "octavos:left:0": { home_team: buildBracketTeam("Instituto"), away_team: buildBracketTeam("Huracan") },
      }),
    });

    await app.open("/?tab=ligas");
    await page.getByRole("button", { name: "VER LLAVES PLAYOFFS", exact: true }).click();

    // El backend manda "A confirmar": antes no se reconocía y los 14 cruces vacíos decían "Programado".
    await expect(page.getByText("Instituto").filter({ visible: true })).toBeVisible();
    await expect(page.getByText("Programado").filter({ visible: true })).toHaveCount(1);
  });

  test("el simulador ofrece las fechas pendientes y no los cruces de playoff", async ({ app, page, api, session }) => {
    session.loginAs("USER");
    mockLeague(api, {
      pendings: [buildPendingGroup("16", [["Tigre", "Banfield"]]), buildPendingGroup("octavos", [["Instituto", "Huracan"]])],
    });

    await app.open("/?tab=ligas");

    await expect(page.getByRole("heading", { name: "Simulador" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Simulador de Resultados/ })).toBeVisible();
    await expect(page.getByText("Tigre", { exact: true })).toBeVisible();
    // Con el cruce de octavos aparecía una segunda ronda, "Fecha NaN", sin partidos.
    await expect(page.getByText("Fecha 16")).toHaveCount(0);
    await expect(page.getByText("Instituto", { exact: true })).toHaveCount(0);
  });

  test("durante los playoffs no muestra el simulador", async ({ app, page, api, session }) => {
    session.loginAs("USER");
    mockLeague(api, { pendings: [buildPendingGroup("octavos", [["Instituto", "Huracan"]])] });

    await app.open("/?tab=ligas");

    await expect(page.getByRole("link", { name: "Boca Juniors vs River Plate" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Simulador" })).toHaveCount(0);
    // Tampoco el atajo del menú, que no tendría adónde ir.
    await expect(page.getByRole("button", { name: /Simulador de Resultados/ })).toHaveCount(0);
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

// Tabla de la temporada con un Apertura terminado y un Clausura en juego. Boca y River están en la
// Zona A de los dos torneos, como en la Liga real; Racing e Independiente, en la Zona B.
// `withBocaRiver` / `withRacingIndependiente`: la tabla del backend ya incluye ese partido (1-0 y 0-0).
function seasonStandings({ withBocaRiver = false, withRacingIndependiente = false } = {}): FullStandingsResponse {
  const row = buildStandingRow;
  const apertura = {
    A: [
      row("Boca Juniors", { played: 16, won: 9, draw: 3, lost: 4, points: 30, goalsFor: 25, goalsAgainst: 15, goalDiff: 10 }),
      row("River Plate", { position: 2, played: 16, won: 8, draw: 4, lost: 4, points: 28, goalsFor: 20, goalsAgainst: 14, goalDiff: 6 }),
    ],
    B: [
      row("Racing Club", { played: 16, won: 6, draw: 5, lost: 5, points: 23, goalsFor: 18, goalsAgainst: 17, goalDiff: 1 }),
      row("Independiente", { position: 2, played: 16, won: 5, draw: 5, lost: 6, points: 20, goalsFor: 15, goalsAgainst: 18, goalDiff: -3 }),
    ],
  };
  const clausura = {
    A: [
      withBocaRiver
        ? row("Boca Juniors", { played: 11, won: 8, draw: 0, lost: 3, points: 24, goalsFor: 16, goalsAgainst: 9, goalDiff: 7 })
        : row("Boca Juniors", { played: 10, won: 7, draw: 0, lost: 3, points: 21, goalsFor: 15, goalsAgainst: 9, goalDiff: 6 }),
      withBocaRiver
        ? row("River Plate", { position: 2, played: 11, won: 5, draw: 4, lost: 2, points: 19, goalsFor: 12, goalsAgainst: 8, goalDiff: 4 })
        : row("River Plate", { position: 2, played: 10, won: 5, draw: 4, lost: 1, points: 19, goalsFor: 12, goalsAgainst: 7, goalDiff: 5 }),
    ],
    B: [
      row("Racing Club", { played: withRacingIndependiente ? 11 : 10, won: 3, draw: withRacingIndependiente ? 4 : 3, lost: 4, points: withRacingIndependiente ? 13 : 12, goalsFor: 9, goalsAgainst: 11, goalDiff: -2 }),
      row("Independiente", { position: 2, played: withRacingIndependiente ? 11 : 10, won: 2, draw: withRacingIndependiente ? 5 : 4, lost: 4, points: withRacingIndependiente ? 11 : 10, goalsFor: 8, goalsAgainst: 12, goalDiff: -4 }),
    ],
  };
  return {
    apertura: { tournament: "APERTURA", groups: apertura },
    clausura: { tournament: "CLAUSURA", groups: clausura },
    annual: [],
    averages: [],
    updated_at: "2026-10-24T12:00:00.000Z",
  };
}

const BOCA_RIVER = { home_team_id: "team-boca-juniors", away_team_id: "team-river-plate" };
const finalScore = (h: number, a: number, homeTeamId: string, awayTeamId: string) => ({ h, a, hp: 0, ap: 0, homeTeamId, awayTeamId, status: "FT", elapsed: 90 });

test.describe("Ligas: penales en el fixture", () => {
  test("un cruce que se define por penales muestra la tanda en vivo y al terminar", async ({ app, page, api, session, socket }) => {
    session.loginAs("USER");
    const live = buildMatchFixture({ id: "m-pen", ...BOCA_RIVER, status_short: "2H", elapsed: 90, home_goals: 1, away_goals: 1, is_live: true });
    mockLeague(api, { matchdays: { "5": buildMatchday("5", [live]) } });

    await app.open("/?tab=ligas");
    const row = page.getByRole("link", { name: "Boca Juniors vs River Plate" });
    await expect(row).toContainText("1-1");
    await socket.waitForEmit("join_competition");

    const tick = (status: string, hp: number, ap: number) =>
      socket.emit("on_league_update", {
        "m-pen": { h: 1, a: 1, hp, ap, homeTeamId: BOCA_RIVER.home_team_id, awayTeamId: BOCA_RIVER.away_team_id, status, elapsed: 120, isLive: status === "P", isPlayoff: true },
      });

    await tick("P", 2, 1);
    await expect(row).toHaveAccessibleName("Boca Juniors vs River Plate, penales en vivo, 1 a 1, penales 2 a 1");
    await expect(row).toContainText("Penales en vivo");
    await expect(row).toContainText("(2 - 1)");
    // En la tanda el reloj no corre: no se muestra el 120.
    await expect(row).not.toContainText("120'");

    await tick("PEN", 4, 3);
    await expect(row).toHaveAccessibleName("Boca Juniors vs River Plate, final, 1 a 1, penales 4 a 3");
    await expect(row).toContainText("(4 - 3)");
    await expect(row).not.toContainText("Penales en vivo");
  });
});

test.describe("Ligas: la tabla con partidos en vivo", () => {
  const zoneTable = (page: import("@playwright/test").Page) =>
    page.getByRole("table").filter({ has: page.getByRole("columnheader", { name: "Pos" }) });
  const annualTable = (page: import("@playwright/test").Page) =>
    page.getByRole("table").filter({ has: page.getByRole("columnheader", { name: "Estado" }) });
  const standingsRequests = (api: import("../../../support/api-mock").ApiMock) => api.requests("GET", "/standings/seasons/:season").length;

  test("un partido en vivo del Clausura se cuenta una sola vez en la tabla anual", async ({ app, page, api, session }) => {
    session.loginAs("USER");
    const live = buildMatchFixture({ id: "m-vivo", ...BOCA_RIVER, status_short: "2H", elapsed: 60, home_goals: 1, away_goals: 0, is_live: true });
    mockLeague(api, { standings: seasonStandings(), matchdays: { "5": buildMatchday("5", [live]) } });

    await app.open("/?tab=ligas");

    // Clausura: 21 + 3. Anual: Apertura 30 + Clausura 21 + 3 = 54, con 16 + 10 + 1 = 27 jugados.
    await expect(zoneTable(page).getByRole("row", { name: /Boca Juniors/ })).toContainText("24");
    const annualBoca = annualTable(page).getByRole("row", { name: /Boca Juniors/ });
    await expect(annualBoca).toContainText("54");
    await expect(annualBoca).toContainText("27");
    await expect(annualBoca).not.toContainText("57");
  });

  test("en un interzonal en vivo cada equipo suma en su propia zona", async ({ app, page, api, session }) => {
    session.loginAs("USER");
    const live = buildMatchFixture({
      id: "m-interzonal",
      home_team_id: "team-boca-juniors",
      away_team_id: "team-racing-club",
      away_team: { name: "Racing Club", logo_url: buildMatchFixture().away_team.logo_url },
      status_short: "2H",
      elapsed: 70,
      home_goals: 1,
      away_goals: 0,
      is_live: true,
    });
    mockLeague(api, { standings: seasonStandings(), matchdays: { "5": buildMatchday("5", [live]) } });

    await app.open("/?tab=ligas");

    await expect(zoneTable(page).getByRole("row", { name: /Boca Juniors/ })).toContainText("24");
    // Racing (Zona B) suma el partido perdido: 16 + 10 + 1 = 27 jugados en la anual.
    await expect(annualTable(page).getByRole("row", { name: /Racing Club/ })).toContainText("27");
  });

  test("un partido de playoff en vivo no suma a la tabla", async ({ app, page, api, session }) => {
    session.loginAs("USER");
    const live = buildMatchFixture({ id: "m-playoff", ...BOCA_RIVER, is_playoff: true, status_short: "2H", elapsed: 60, home_goals: 1, away_goals: 0, is_live: true });
    mockLeague(api, { standings: seasonStandings(), matchdays: { "5": buildMatchday("5", [live]) } });

    await app.open("/?tab=ligas");

    await expect(page.getByRole("link", { name: "Boca Juniors vs River Plate" })).toContainText("ST60");
    await expect(zoneTable(page).getByRole("row", { name: /Boca Juniors/ })).toContainText("21");
    await expect(zoneTable(page).getByRole("row", { name: /Boca Juniors/ })).not.toContainText("24");
  });

  test("al terminar el partido los puntos siguen en la tabla hasta que el backend la actualiza", { tag: "@p0" }, async ({ app, page, api, session, socket }) => {
    session.loginAs("USER");
    await page.clock.install();
    const live = buildMatchFixture({ id: "m-final", ...BOCA_RIVER, status_short: "2H", elapsed: 88, home_goals: 1, away_goals: 0, is_live: true });
    let standings = seasonStandings();
    mockLeague(api, { matchdays: { "5": buildMatchday("5", [live]) } });
    api.on("GET", "/standings/seasons/:season", () => standings);

    await app.open("/?tab=ligas");
    const bocaRow = zoneTable(page).getByRole("row", { name: /Boca Juniors/ });
    await expect(bocaRow).toContainText("24");
    await socket.waitForEmit("join_competition");

    await socket.emit("on_league_update", { "m-final": finalScore(1, 0, "team-boca-juniors", "team-river-plate") });
    await expect(page.getByRole("link", { name: "Boca Juniors vs River Plate" })).toContainText("Finalizado");
    await expect(bocaRow).toContainText("24");

    // A los 2 minutos pide la tabla, pero el proveedor todavía no la actualizó: sigue sumando.
    let before = standingsRequests(api);
    await page.clock.fastForward("02:30");
    await expect.poll(() => standingsRequests(api)).toBeGreaterThan(before);
    await expect(bocaRow).toContainText("24");

    // A los 4 minutos la tabla ya tiene el partido: deja de sumarlo y no queda contado dos veces.
    standings = seasonStandings({ withBocaRiver: true });
    before = standingsRequests(api);
    await page.clock.fastForward("02:00");
    await expect.poll(() => standingsRequests(api)).toBeGreaterThan(before);
    await expect(bocaRow).toContainText("24");
    await expect(bocaRow).not.toContainText("27");
  });

  test("un segundo final de la fecha no vuelve a sumar un partido que la tabla ya incluye", async ({ app, page, api, session, socket }) => {
    session.loginAs("USER");
    await page.clock.install();
    const bocaRiver = buildMatchFixture({ id: "m-a", ...BOCA_RIVER, status_short: "2H", elapsed: 88, home_goals: 1, away_goals: 0, is_live: true });
    const racingIndependiente = buildMatchFixture({
      id: "m-b",
      home_team_id: "team-racing-club",
      away_team_id: "team-independiente",
      home_team: { name: "Racing Club", logo_url: bocaRiver.home_team.logo_url },
      away_team: { name: "Independiente", logo_url: bocaRiver.home_team.logo_url },
      status_short: "2H",
      elapsed: 70,
      home_goals: 0,
      away_goals: 0,
      is_live: true,
    });
    let standings = seasonStandings();
    mockLeague(api, { matchdays: { "5": buildMatchday("5", [bocaRiver, racingIndependiente]) } });
    api.on("GET", "/standings/seasons/:season", () => standings);

    await app.open("/?tab=ligas");
    const bocaRow = zoneTable(page).getByRole("row", { name: /Boca Juniors/ });
    await expect(bocaRow).toContainText("24");
    await socket.waitForEmit("join_competition");

    // Termina Boca-River y la tabla nueva ya lo incluye.
    await socket.emit("on_league_update", { "m-a": finalScore(1, 0, "team-boca-juniors", "team-river-plate") });
    standings = seasonStandings({ withBocaRiver: true });
    let before = standingsRequests(api);
    await page.clock.fastForward("02:30");
    await expect.poll(() => standingsRequests(api)).toBeGreaterThan(before);
    await expect(bocaRow).toContainText("24");

    // Más tarde termina Racing-Independiente: Boca-River no se vuelve a sumar.
    await socket.emit("on_league_update", { "m-b": finalScore(0, 0, "team-racing-club", "team-independiente") });
    await expect(page.getByRole("link", { name: "Racing Club vs Independiente" })).toContainText("Finalizado");
    await expect(bocaRow).toContainText("24");
    await expect(bocaRow).not.toContainText("27");

    standings = seasonStandings({ withBocaRiver: true, withRacingIndependiente: true });
    before = standingsRequests(api);
    await page.clock.fastForward("02:30");
    await expect.poll(() => standingsRequests(api)).toBeGreaterThan(before);
    await expect(bocaRow).toContainText("24");
  });
});
