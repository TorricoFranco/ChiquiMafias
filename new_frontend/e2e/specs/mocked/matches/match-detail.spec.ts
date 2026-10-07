import type { MatchDetails } from "@/features/matches/types";
import { expect, test } from "../../../fixtures/test";
import { buildMarket, buildMatchMarket } from "../../../factories/bets";
import { buildChatMessage } from "../../../factories/chat";
import { buildCalendar, buildMatchFixture } from "../../../factories/fixtures";
import { buildMatchDetails, buildPreMatch } from "../../../factories/matches";
import type { ApiMock } from "../../../support/api-mock";
import { BASE_URL } from "../../../support/env";
import { ChatPanel } from "../../../pages/chat-panel";

function mockMatch(api: ApiMock, match: MatchDetails) {
  api.on("GET", "/matches/leagues/:leagueId/seasons/:season/matches/:matchId", match);
  api.on("GET", "/matches/pre-match/:matchId", buildPreMatch());
}

const scoreboard = (page: import("@playwright/test").Page) => page.getByRole("group", { name: /^Marcador:/ });

test.describe("Detalle de partido", () => {
  test("desde el fixture se abre como modal y volver lo cierra", { tag: "@p0" }, async ({ app, page, api }) => {
    const match = buildMatchDetails();
    const fixture = buildMatchFixture({ id: match.metadata.id, date: "2030-01-15T23:00:00.000Z" });
    api.on("GET", "/fixtures/seasons/:season/calendar", buildCalendar({ "2030-01-15": [fixture] }));
    mockMatch(api, match);

    await app.open();
    await page.getByRole("link", { name: "Boca Juniors vs River Plate" }).click();

    // Con `next dev`, la primera visita a la ruta interceptada la compila (varios segundos).
    await expect(page).toHaveURL(`${BASE_URL}/match/${match.metadata.id}`, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Boca Juniors" })).toBeVisible();

    await page.getByRole("button", { name: "Volver al fixture" }).click();
    await expect(page).toHaveURL(`${BASE_URL}/`);
    await expect(page.getByRole("heading", { name: "Boca Juniors" })).toBeHidden();
  });

  test("la URL directa muestra la página completa del partido", async ({ page, api }) => {
    const match = buildMatchDetails();
    mockMatch(api, match);

    await page.goto(`/match/${match.metadata.id}`);

    await expect(page.getByRole("heading", { name: "River Plate" })).toBeVisible();
    await expect(page.getByText("La Bombonera")).toBeVisible();
    await page.getByRole("button", { name: "Volver al fixture" }).click();
    await expect(page).toHaveURL(`${BASE_URL}/`);
  });

  test("un partido sin empezar muestra el historial y el chat", async ({ page, api }) => {
    const match = buildMatchDetails({ metadata: { status: "NS" } });
    mockMatch(api, match);

    await page.goto(`/match/${match.metadata.id}`);

    await expect(page.getByRole("tab", { name: "Historial" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tab", { name: "Chat en Vivo" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Resumen" })).toBeHidden();
    await expect(page.getByText("Partidos recientes:").first()).toBeVisible();
  });

  test("un partido terminado no ofrece chat", async ({ page, api }) => {
    const match = buildMatchDetails({ metadata: { status: "FT", status_long: "Match Finished" }, score: { home: 2, away: 1 } });
    mockMatch(api, match);

    await page.goto(`/match/${match.metadata.id}`);

    await expect(scoreboard(page)).toHaveAccessibleName("Marcador: Boca Juniors 2, River Plate 1");
    await expect(page.getByText("FINALIZADO")).toBeVisible();
    await expect(page.getByRole("tab", { name: "Resumen" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Chat en Vivo" })).toBeHidden();
  });

  test("el marcador en vivo se actualiza por socket", { tag: "@p0" }, async ({ page, api, socket }) => {
    const match = buildMatchDetails({ metadata: { status: "1H" }, score: { home: 0, away: 0, elapsed: 10 } });
    mockMatch(api, match);

    await page.goto(`/match/${match.metadata.id}`);
    await expect(scoreboard(page)).toHaveAccessibleName("Marcador: Boca Juniors 0, River Plate 0");
    expect(await socket.waitForEmit("join_match")).toEqual({ matchId: match.metadata.id });

    await socket.emit("match_live_update", { matchId: match.metadata.id, type: "SCORE_UPDATED", h: 1, a: 0, status: "1H", elapsed: 23 });

    await expect(scoreboard(page)).toHaveAccessibleName("Marcador: Boca Juniors 1, River Plate 0");
    await expect(page.getByText("1T 23'")).toBeVisible();
  });

  test("si el detalle no carga se puede reintentar", async ({ page, api }) => {
    const match = buildMatchDetails();
    let available = false;
    api.handle("GET", "/matches/leagues/:leagueId/seasons/:season/matches/:matchId", () =>
      available ? { body: match } : { status: 503, body: { statusCode: 503, message: "Servicio de partidos no disponible" } },
    );
    api.on("GET", "/matches/pre-match/:matchId", buildPreMatch());

    await page.goto(`/match/${match.metadata.id}`);

    // React Query reintenta 3 veces con backoff antes de mostrar el error.
    await expect(page.getByRole("heading", { name: "Error al consultar el partido" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Servicio de partidos no disponible")).toBeVisible();

    available = true;
    await page.getByRole("button", { name: "Reintentar" }).click();
    await expect(page.getByRole("heading", { name: "Boca Juniors" })).toBeVisible();
  });
});

test.describe("Predicción del partido", () => {
  test("muestra el mercado de este partido y no el de otro con un equipo en común", { tag: "@p0" }, async ({ page, api, session }) => {
    session.loginAs("USER");
    const match = buildMatchDetails({
      teams: {
        home: { id: "team-boca", name: "Boca Juniors", logo: null, short_code: "BOC" },
        away: { id: "team-racing", name: "Racing Club", logo: null, short_code: "RAC" },
      },
    });
    const bocaRiver = buildMatchMarket({ title: "Boca vs River" });
    const bocaRacing = buildMatchMarket({
      title: "Boca vs Racing",
      metadata: {
        homeTeam: { name: "Boca Juniors", short: "BOC", logoUrl: "boca" },
        awayTeam: { name: "Racing Club", short: "RAC", logoUrl: "racing" },
      },
    });
    api.on("GET", "/bets/markets", [bocaRiver, bocaRacing, buildMarket()]);
    mockMatch(api, match);

    await page.goto(`/match/${match.metadata.id}`);

    await expect(page.getByText("Predicción del Partido")).toBeVisible();
    await expect(page.getByRole("article", { name: "Boca vs Racing" })).toBeVisible();
    await expect(page.getByRole("article", { name: "Boca vs River" })).toBeHidden();
  });

  test("sin mercado para este partido no muestra la predicción", async ({ page, api, session }) => {
    session.loginAs("USER");
    const match = buildMatchDetails({
      teams: {
        home: { id: "team-boca", name: "Boca Juniors", logo: null, short_code: "BOC" },
        away: { id: "team-racing", name: "Racing Club", logo: null, short_code: "RAC" },
      },
    });
    api.on("GET", "/bets/markets", [buildMatchMarket({ title: "Boca vs River" })]);
    mockMatch(api, match);

    await page.goto(`/match/${match.metadata.id}`);

    await expect(page.getByRole("heading", { name: "Racing Club" })).toBeVisible();
    await expect(page.getByText("Predicción del Partido")).toBeHidden();
  });
});

test.describe("Chat del partido", () => {
  test("se une a la sala, muestra el historial y envía mensajes", { tag: ["@p0", "@mobile"] }, async ({ page, api, session, socket }) => {
    session.loginAs("USER");
    const match = buildMatchDetails({ metadata: { status: "2H" }, score: { home: 1, away: 1, elapsed: 70 } });
    mockMatch(api, match);
    const chat = new ChatPanel(page);

    // Como el MatchesGateway: el historial llega al unirse a la sala del partido.
    socket.onEmit("join_match", (_data, ctx) =>
      ctx.emit("match_chat_history", [buildChatMessage({ name: "Hincha Millonario", message: "Vamos River" })]),
    );

    await page.goto(`/match/${match.metadata.id}`);
    await page.getByRole("tab", { name: "Chat en Vivo" }).click();

    await expect(chat.message("Hincha Millonario")).toContainText("Vamos River");

    await chat.send("Se viene el segundo");
    expect(await socket.waitForEmit("send_chat_message")).toEqual({
      matchId: match.metadata.id,
      message: "Se viene el segundo",
      stickerId: null,
      useMegaphone: false,
    });
  });
});
