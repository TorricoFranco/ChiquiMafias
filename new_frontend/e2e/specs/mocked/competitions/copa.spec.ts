import { expect, test } from "../../../fixtures/test";
import {
  buildBracket,
  buildBracketTeam,
  buildCompetition,
  buildCopaArgentina,
} from "../../../factories/competitions";
import { buildMatchFixture } from "../../../factories/fixtures";
import { LOCAL_IMAGE } from "../../../factories/ids";
import { buildMatchDetails, buildPreMatch } from "../../../factories/matches";
import { BASE_URL } from "../../../support/env";
import { mockLeague } from "../../../support/league";
import type { ApiMock } from "../../../support/api-mock";

const COPA = "/torneos/copa-argentina";
const boca = buildBracketTeam("Boca Juniors", { apiTeamId: 451 });
const banfield = buildBracketTeam("Banfield");
const tucuman = buildBracketTeam("Atletico Tucuman");
const platense = buildBracketTeam("Platense");

// Cuartos jugados, semis por jugar y la final por definir. Un partido de
// 32avos postergado no tiene que arrastrar la ronda por defecto.
const bracket = buildBracket({
  "32avos:5": {
    matchId: "m-postergado",
    status: "PST",
    date: "2030-03-01T22:00:00.000Z",
    home: buildBracketTeam("Midland"),
    away: buildBracketTeam("Atlanta"),
  },
  "cuartos:3": {
    matchId: "m-cuartos",
    status: "PEN",
    home: banfield,
    away: buildBracketTeam("Deportivo Riestra"),
    homeGoals: 1,
    awayGoals: 1,
    homePenalties: 4,
    awayPenalties: 2,
    winnerTeamId: banfield.id,
  },
  "semifinal:1": {
    matchId: "m-semi-1",
    status: "NS",
    date: "2030-10-29T22:00:00.000Z",
    home: tucuman,
    away: platense,
  },
  "semifinal:2": {
    matchId: "m-semi-2",
    status: "NS",
    date: "2030-11-14T22:00:00.000Z",
    home: banfield,
    away: boca,
  },
});

function mockCopa(api: ApiMock) {
  api.on("GET", "/competitions", [buildCompetition(), buildCopaArgentina()]);
  api.on("GET", "/competitions/:slug/bracket", bracket);
  api.on("GET", "/competitions/:slug/matches", (req) => ({
    page: 1,
    pageSize: 50,
    total: 2,
    matches:
      req.query.get("round") === "Semifinal"
        ? [
            buildMatchFixture({
              id: "m-semi-1",
              round: "Semifinal",
              date: "2030-10-29T22:00:00.000Z",
              home_team: { name: "Atletico Tucuman", logo_url: LOCAL_IMAGE },
              away_team: { name: "Platense", logo_url: LOCAL_IMAGE },
            }),
            buildMatchFixture({
              id: "m-semi-2",
              round: "Semifinal",
              date: "2030-11-14T22:00:00.000Z",
              home_team: { name: "Banfield", logo_url: LOCAL_IMAGE },
              away_team: { name: "Boca Juniors", logo_url: LOCAL_IMAGE },
            }),
          ]
        : [
            buildMatchFixture({
              id: "m-cuartos",
              round: "Cuartos de final",
              status_short: "PEN",
              home_goals: 1,
              away_goals: 1,
              home_penalty_goals: 4,
              away_penalty_goals: 2,
              home_team: { name: "Banfield", logo_url: LOCAL_IMAGE },
              away_team: { name: "Deportivo Riestra", logo_url: LOCAL_IMAGE },
            }),
          ],
  }));
}

test.describe("Copa Argentina", () => {
  test("arranca en la ronda por jugar y lista sus partidos con la fecha", async ({ app, page, api }) => {
    mockCopa(api);

    await app.open(COPA);

    await expect(page.getByRole("heading", { name: "Copa Argentina 2026" })).toBeVisible();
    await expect(page.getByText("Eliminación directa a partido único · Cancha neutral")).toBeVisible();
    await expect(page.getByRole("button", { name: "Semifinal", exact: true })).toHaveAttribute("aria-pressed", "true");
    // Las rondas sin partidos no se pueden elegir.
    await expect(page.getByRole("button", { name: "Final", exact: true })).toBeDisabled();
    await expect(page.getByRole("link", { name: "Atletico Tucuman vs Platense" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Banfield vs Boca Juniors" })).toContainText("14/11");
    expect(api.lastRequest("GET", "/competitions/:slug/matches")?.path).toMatch(/\/competitions\/copa-argentina\/matches$/);
  });

  test("otra ronda muestra el resultado con los penales", async ({ app, page, api }) => {
    mockCopa(api);

    await app.open(COPA);
    const cuartos = page.getByRole("button", { name: "Cuartos de final", exact: true });
    await cuartos.click();
    // Si esto falla, se perdió el click (por ejemplo, una recarga de next dev).
    await expect(cuartos).toHaveAttribute("aria-pressed", "true");

    // El nombre accesible dice el resultado, no solo los equipos.
    const match = page.getByRole("link", {
      name: "Banfield vs Deportivo Riestra, final, 1 a 1, penales 4 a 2",
    });
    await expect(match).toContainText("Penales");
    await expect(match).toContainText("1 - 1");
    await expect(match).toContainText("(4 - 2)");
  });

  test("el cuadro muestra las llaves, el ganador y los lugares por definir", async ({ app, page, api }) => {
    mockCopa(api);

    await app.open(COPA);
    await page.getByRole("tab", { name: "Cuadro" }).click();

    await expect(page.getByRole("tabpanel")).toBeVisible();
    // Se ve desde octavos: 32avos y 16avos quedan a un toque.
    await expect(page.getByRole("region", { name: "Octavos de final", exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "32avos de final", exact: true })).toHaveCount(0);

    const semi = page.getByRole("link", { name: "Banfield vs Boca Juniors" });
    await expect(semi).toBeVisible();
    // Boca tiene ID de API-Football: su escudo es el asset local.
    await expect(semi.locator("img").nth(1)).toHaveAttribute("src", "/escudos-api/451.webp");
    await expect(page.getByRole("region", { name: "Final", exact: true }).getByText("Por definir")).toHaveCount(2);

    await page.getByRole("button", { name: "Desde 32avos de final" }).click();
    await expect(page.getByRole("region", { name: "32avos de final", exact: true })).toBeVisible();
  });

  test("tocar la Copa en el menú de Ligas abre su página", async ({ app, page, api }) => {
    mockLeague(api);
    mockCopa(api);

    await app.open("/?tab=ligas");
    await page.getByRole("button", { name: "Copa Argentina" }).click();

    await expect(page).toHaveURL(`${BASE_URL}${COPA}`);
    await expect(page.getByRole("heading", { name: "Copa Argentina 2026" })).toBeVisible();
  });

  test("una competición sin página propia avisa y deja volver", async ({ app, page, api }) => {
    api.on("GET", "/competitions", [buildCompetition()]);

    await app.open("/torneos/no-existe");

    await expect(page.getByRole("heading", { name: "Competición no disponible" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Volver a Ligas" })).toBeVisible();
  });

  test("el detalle de un partido de la Copa no habla de local ni visitante", async ({ app, page, api }) => {
    const match = buildMatchDetails({
      metadata: { status: "FT", status_long: "Match Finished" },
      events: [
        {
          id: "e1",
          minute: 10,
          extraMinute: null,
          type: "Goal",
          detail: "Normal Goal",
          team: { id: "team-boca", name: "Boca Juniors", logo_url: null },
          player: { id: "p1", name: "Merentiel", photo: null },
          assist: null,
          substitutionLog: null,
        },
      ],
      competition: {
        slug: "copa-argentina",
        name: "Copa Argentina",
        shortName: "Copa Argentina",
        neutralVenue: true,
        seasonLabel: "2026",
      },
    });
    api.on("GET", "/matches/:matchId", match);
    api.on("GET", "/matches/pre-match/:matchId", buildPreMatch());

    await app.open(`/match/${match.metadata.id}`);

    await expect(page.getByText(/Cronología del Partido/)).toBeVisible();
    await expect(page.getByText(/Local:|Visita:/)).toHaveCount(0);
  });

  test("la tanda en vivo se ve en la lista y en el cuadro, con el marcador por socket", async ({ app, page, api, socket }) => {
    mockCopa(api);

    await app.open(COPA);
    const semi = page.getByRole("link", { name: /^Atletico Tucuman vs Platense/ });
    await expect(semi).toBeVisible();
    await socket.waitForEmit("join_competition");

    await socket.emit("on_league_update", {
      "m-semi-1": {
        h: 1,
        a: 1,
        hp: 3,
        ap: 2,
        homeTeamId: tucuman.id,
        awayTeamId: platense.id,
        status: "P",
        elapsed: 120,
        isLive: true,
        isPlayoff: true,
      },
    });

    await expect(semi).toHaveAccessibleName("Atletico Tucuman vs Platense, penales en vivo, 1 a 1, penales 3 a 2");
    await expect(semi).toContainText("Penales en vivo");
    await expect(semi).toContainText("(3 - 2)");

    await page.getByRole("tab", { name: "Cuadro" }).click();
    const llave = page.getByRole("link", { name: /^Atletico Tucuman vs Platense/ });
    await expect(llave).toHaveAccessibleName(/penales en vivo, 1 a 1, penales 3 a 2/);
    await expect(llave).toContainText("Penales en vivo");
  });

  test("un partido terminado no vuelve a estar en vivo por un dato viejo del socket", async ({ app, page, api, socket }) => {
    mockCopa(api);

    await app.open(COPA);
    await page.getByRole("tab", { name: "Cuadro" }).click();
    const cuartos = page.getByRole("link", { name: /^Banfield vs Deportivo Riestra/ });
    await expect(cuartos).toHaveAccessibleName(/gana Banfield/);

    // Último tick de la tanda: el socket deja de mandar el partido cuando termina.
    await socket.emit("on_league_update", {
      "m-cuartos": {
        h: 1,
        a: 1,
        hp: 3,
        ap: 2,
        homeTeamId: banfield.id,
        awayTeamId: "team-Deportivo Riestra",
        status: "P",
        elapsed: 120,
        isLive: true,
        isPlayoff: true,
      },
    });

    await expect(cuartos).toHaveAccessibleName(/penales 4 a 2, gana Banfield/);
    await expect(cuartos).not.toHaveAccessibleName(/en vivo/);
  });
});
