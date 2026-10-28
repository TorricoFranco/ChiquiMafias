import { expect, test } from "../../../fixtures/test";
import { buildCompetition, buildCopaArgentina } from "../../../factories/competitions";
import { buildCalendar, buildLiveScore, buildMatchFixture } from "../../../factories/fixtures";
import { LOCAL_IMAGE } from "../../../factories/ids";
import type { ApiMock } from "../../../support/api-mock";
import type { MatchFixture } from "@/features/fixture/types";

const DAY = "2030-01-15";

const ligaMatch = buildMatchFixture({ id: "m-liga", date: `${DAY}T20:00:00.000Z` });

const copaMatch = (overrides: Partial<MatchFixture> = {}) =>
  buildMatchFixture({
    id: "m-copa",
    date: `${DAY}T23:00:00.000Z`,
    round: "Semifinal",
    home_team: { name: "Atletico Tucuman", logo_url: LOCAL_IMAGE },
    away_team: { name: "Platense", logo_url: LOCAL_IMAGE },
    home_team_id: "team-tucuman",
    away_team_id: "team-platense",
    ...overrides,
  });

function mockSocial(api: ApiMock, copa: MatchFixture) {
  api.on("GET", "/competitions", [buildCompetition(), buildCopaArgentina()]);
  api.on("GET", "/fixtures/seasons/:season/calendar", buildCalendar({ [DAY]: [ligaMatch] }));
  api.on("GET", "/competitions/:slug/matches", (req) => ({
    page: 1,
    pageSize: 50,
    total: req.params.slug === "copa-argentina" ? 1 : 0,
    matches: req.params.slug === "copa-argentina" ? [copa] : [],
  }));
}

test.describe("Fixture de Social con la Liga y la Copa", () => {
  test("muestra los partidos de la Copa junto a los de la Liga, cada uno con su competición", async ({ app, page, api }) => {
    mockSocial(api, copaMatch());

    await app.open();

    await expect(page.getByRole("link", { name: "Boca Juniors vs River Plate, Liga Profesional" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Atletico Tucuman vs Platense, Copa Argentina" })).toBeVisible();
    await expect(page.getByText("2 partidos")).toBeVisible();
    expect(api.lastRequest("GET", "/competitions/:slug/matches")?.path).toMatch(/\/competitions\/copa-argentina\/matches$/);
  });

  test("sigue en vivo las dos competiciones por un solo socket y muestra la tanda de la Copa", async ({ app, page, api, socket }) => {
    mockSocial(api, copaMatch({ status_short: "2H", elapsed: 90, home_goals: 1, away_goals: 1, is_live: true }));

    await app.open();
    const live = page.getByRole("region", { name: "Partidos en vivo" });
    await expect(live).toContainText("Copa Argentina");
    await expect
      .poll(() => socket.emitted("join_competition").map((d) => (d as { slug: string }).slug).sort())
      .toEqual(["copa-argentina", "liga-profesional"]);

    await socket.emit("on_league_update", {
      "m-copa": {
        h: 1,
        a: 1,
        hp: 2,
        ap: 1,
        homeTeamId: "team-tucuman",
        awayTeamId: "team-platense",
        status: "P",
        elapsed: 120,
        isLive: true,
        isPlayoff: true,
      },
    });

    await expect(live).toContainText("Penales en vivo");
    await expect(live).toContainText("(2 - 1)");
  });

  test("si el vivo de la Copa falla, la Liga muestra igual su partido en vivo", async ({ app, page, api }) => {
    mockSocial(api, copaMatch());
    api.handle("GET", "/competitions/:slug/live", (req) =>
      req.params.slug === "copa-argentina"
        ? { status: 500, body: { statusCode: 500, message: "Error" } }
        : { body: [buildLiveScore({ matchId: "m-liga" })] },
    );

    await app.open();

    // Ni espera los reintentos de la Copa ni pierde el vivo de la Liga.
    await expect(page.getByRole("region", { name: "Partidos en vivo" })).toContainText("Boca Juniors", { timeout: 4_000 });
  });

  test("un partido de la Copa terminado por penales muestra la tanda", async ({ app, page, api }) => {
    mockSocial(api, copaMatch({ status_short: "PEN", home_goals: 1, away_goals: 1, home_penalty_goals: 4, away_penalty_goals: 3 }));

    await app.open();

    const match = page.getByRole("link", { name: /^Atletico Tucuman vs Platense/ });
    await expect(match).toHaveAccessibleName("Atletico Tucuman vs Platense, Copa Argentina, final, 1 a 1, penales 4 a 3");
    await expect(match).toContainText("(4 - 3)");
  });
});
