import type { MatchDetails } from "@/features/matches/types";
import { expect, test } from "../../../fixtures/test";
import { buildMarket, buildMatchMarket } from "../../../factories/bets";
import { buildChatMessage, buildMatchChatMessage } from "../../../factories/chat";
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

  test("si el backend corta el socket por token vencido, renueva la sesión y vuelve a la sala del partido", { tag: "@p0" }, async ({ page, api, session, socket }) => {
    session.loginAs("USER");
    const match = buildMatchDetails({ metadata: { status: "1H" }, score: { home: 0, away: 0, elapsed: 10 } });
    mockMatch(api, match);
    const handshakeTokens: unknown[] = [];
    socket.onConnect((auth) => handshakeTokens.push((auth as { token?: unknown } | undefined)?.token));

    await page.goto(`/match/${match.metadata.id}`);
    await expect(scoreboard(page)).toHaveAccessibleName("Marcador: Boca Juniors 0, River Plate 0");
    await socket.waitForEmit("join_match");
    const joinsBefore = socket.emitted("join_match").length;

    session.expireAccessToken();
    await socket.disconnectAll();

    await expect.poll(() => handshakeTokens).toContain(session.token);
    await expect.poll(() => socket.emitted("join_match").length).toBeGreaterThan(joinsBefore);
    await socket.emit("match_live_update", { matchId: match.metadata.id, type: "SCORE_UPDATED", h: 1, a: 0, status: "1H", elapsed: 31 });
    await expect(scoreboard(page)).toHaveAccessibleName("Marcador: Boca Juniors 1, River Plate 0");
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

  test("un visitante sin sesión ve el historial y los mensajes nuevos", { tag: "@p0" }, async ({ page, api, socket }) => {
    const match = buildMatchDetails({ metadata: { status: "2H" }, score: { home: 1, away: 1, elapsed: 70 } });
    mockMatch(api, match);
    const chat = new ChatPanel(page);

    socket.onEmit("join_match", (_data, ctx) =>
      ctx.emit("match_chat_history", [
        buildMatchChatMessage({ matchId: match.metadata.id, name: "Hincha Millonario", message: "Vamos River" }),
      ]),
    );

    await page.goto(`/match/${match.metadata.id}`);
    await page.getByRole("tab", { name: "Chat en Vivo" }).click();

    await expect(chat.message("Hincha Millonario")).toContainText("Vamos River");

    await socket.emit("on-message", buildMatchChatMessage({
      matchId: match.metadata.id,
      name: "Bostero 12",
      message: "Empatamos igual",
    }));
    await expect(chat.message("Bostero 12")).toContainText("Empatamos igual");

    // Escribir, moderar y reportar piden sesión: el visitante solo lee.
    await expect(chat.input).toBeHidden();
    await expect(page.getByText("Estás mirando la tribuna. Entrá para escribir.")).toBeVisible();
    await expect(
      chat.message("Hincha Millonario").getByRole("button", { name: "Opciones del mensaje de Hincha Millonario" }),
    ).toBeHidden();
  });

  test("los mensajes del chat global no se mezclan con los del partido", async ({ page, api, socket }) => {
    const match = buildMatchDetails({ metadata: { status: "2H" } });
    mockMatch(api, match);
    const chat = new ChatPanel(page);

    socket.onEmit("join_match", (_data, ctx) => ctx.emit("match_chat_history", []));

    await page.goto(`/match/${match.metadata.id}`);
    await page.getByRole("tab", { name: "Chat en Vivo" }).click();

    // El ChatGateway emite "on-message" a todos los sockets, sin matchId.
    await socket.emit("on-message", buildChatMessage({ name: "Charlatán Global", message: "Hola tribuna" }));
    await socket.emit("on-message", buildMatchChatMessage({
      matchId: match.metadata.id,
      name: "Hincha Del Partido",
      message: "Qué partidazo",
    }));

    await expect(chat.message("Hincha Del Partido")).toContainText("Qué partidazo");
    await expect(chat.message("Charlatán Global")).toBeHidden();
  });
});

test.describe("Chat del partido según su estado", () => {
  const chatTab = (page: import("@playwright/test").Page) => page.getByRole("tab", { name: "Chat en Vivo" });

  test("antes de empezar muestra un aviso y no deja escribir", async ({ page, api, session }) => {
    session.loginAs("USER");
    const match = buildMatchDetails({ metadata: { status: "NS" } });
    mockMatch(api, match);
    const chat = new ChatPanel(page);

    await page.goto(`/match/${match.metadata.id}`);
    await chatTab(page).click();

    await expect(page.getByRole("heading", { name: "El chat comienza cuando arranque el partido" })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "El chat comienza cuando arranque el partido" })).toBeAttached();
    await expect(chat.input).toBeHidden();
  });

  test("el chat se abre en vivo con el pitazo inicial", { tag: "@p0" }, async ({ page, api, session, socket }) => {
    session.loginAs("USER");
    const match = buildMatchDetails({ metadata: { status: "NS" } });
    mockMatch(api, match);
    const chat = new ChatPanel(page);
    socket.onEmit("join_match", (_data, ctx) => ctx.emit("match_chat_history", []));

    await page.goto(`/match/${match.metadata.id}`);
    await socket.waitForEmit("join_match");
    await chatTab(page).click();
    await expect(chat.input).toBeHidden();

    await socket.emit("match_live_update", {
      matchId: match.metadata.id,
      type: "MINUTE_TICK",
      h: 0,
      a: 0,
      status: "1H",
      elapsed: 1,
      chatState: "OPEN",
      chatActive: true,
    });

    await expect(chat.input).toBeVisible();
  });

  test("el chat se pausa si el partido se suspende", async ({ page, api, session, socket }) => {
    session.loginAs("USER");
    const match = buildMatchDetails({ metadata: { status: "2H" }, score: { home: 1, away: 0, elapsed: 60 } });
    mockMatch(api, match);
    const chat = new ChatPanel(page);
    socket.onEmit("join_match", (_data, ctx) => ctx.emit("match_chat_history", []));

    await page.goto(`/match/${match.metadata.id}`);
    await socket.waitForEmit("join_match");
    await chatTab(page).click();
    await expect(chat.input).toBeVisible();

    await socket.emit("match_live_update", {
      matchId: match.metadata.id,
      type: "MINUTE_TICK",
      h: 1,
      a: 0,
      status: "SUSP",
      elapsed: 60,
      chatState: "PAUSED",
      chatActive: false,
    });

    await expect(page.getByRole("heading", { name: "Chat pausado: el partido está suspendido" })).toBeVisible();
    // La región viva anuncia el cambio a los lectores de pantalla.
    await expect(page.getByRole("status").filter({ hasText: "Chat pausado: el partido está suspendido" })).toBeAttached();
    await expect(chat.input).toBeHidden();
  });

  test("al terminar el partido desaparece la pestaña de chat", { tag: "@p0" }, async ({ page, api, session, socket }) => {
    session.loginAs("USER");
    const match = buildMatchDetails({ metadata: { status: "2H" }, score: { home: 1, away: 0, elapsed: 90 } });
    mockMatch(api, match);
    socket.onEmit("join_match", (_data, ctx) => ctx.emit("match_chat_history", []));

    await page.goto(`/match/${match.metadata.id}`);
    await socket.waitForEmit("join_match");
    await chatTab(page).click();

    // Como en producción: el backend ya guardó el final, avisa con match_data_update
    // (el front recarga el detalle) y con match_live_update.
    mockMatch(api, { ...match, metadata: { ...match.metadata, status: "FT" }, chatState: "CLOSED", chatActive: false });
    await socket.emit("match_data_update", { matchId: match.metadata.id, type: "MATCH_ENDED", payload: { status: "FT" } });
    await socket.emit("match_live_update", {
      matchId: match.metadata.id,
      type: "MATCH_ENDED",
      h: 1,
      a: 0,
      status: "FT",
      elapsed: 90,
      chatState: "CLOSED",
      chatActive: false,
    });

    await expect(chatTab(page)).toBeHidden();
    await expect(page.getByRole("tab", { name: "Resumen" })).toHaveAttribute("aria-selected", "true");
    // El foco no se pierde: pasa a la pestaña que quedó activa.
    await expect(page.getByRole("tab", { name: "Resumen" })).toBeFocused();
  });

  test("un evento en vivo de otro partido no cambia el chat de este", async ({ page, api, session, socket }) => {
    session.loginAs("USER");
    const match = buildMatchDetails({ metadata: { status: "2H" }, score: { home: 0, away: 0, elapsed: 70 } });
    mockMatch(api, match);
    const chat = new ChatPanel(page);
    socket.onEmit("join_match", (_data, ctx) => ctx.emit("match_chat_history", []));

    await page.goto(`/match/${match.metadata.id}`);
    await socket.waitForEmit("join_match");
    await chatTab(page).click();
    await expect(chat.input).toBeVisible();

    // El socket compartido puede seguir en la sala de un partido visto antes.
    await socket.emit("match_live_update", {
      matchId: "otro-partido",
      type: "MATCH_ENDED",
      h: 3,
      a: 0,
      status: "FT",
      elapsed: 90,
      chatState: "CLOSED",
      chatActive: false,
    });

    await expect(chatTab(page)).toBeVisible();
    await expect(chat.input).toBeVisible();
    await expect(scoreboard(page)).toHaveAccessibleName("Marcador: Boca Juniors 0, River Plate 0");
  });

  test("un partido terminado por penales tampoco ofrece chat", async ({ page, api }) => {
    const match = buildMatchDetails({ metadata: { status: "PEN" }, score: { home: 1, away: 1 } });
    mockMatch(api, match);

    await page.goto(`/match/${match.metadata.id}`);

    await expect(page.getByRole("tab", { name: "Resumen" })).toBeVisible();
    await expect(chatTab(page)).toBeHidden();
  });

  test("si el backend rechaza el mensaje por partido inactivo, avisa al usuario", async ({ page, api, session, socket }) => {
    session.loginAs("USER");
    const match = buildMatchDetails({ metadata: { status: "2H" }, score: { home: 0, away: 0, elapsed: 80 } });
    mockMatch(api, match);
    const chat = new ChatPanel(page);
    socket.onEmit("join_match", (_data, ctx) => ctx.emit("match_chat_history", []));
    socket.onEmit("send_chat_message", (_data, ctx) =>
      ctx.emit("ws-error", { code: "MATCH_INACTIVE", message: "El partido no está activo, la tribuna está cerrada 🛑" }),
    );

    await page.goto(`/match/${match.metadata.id}`);
    await socket.waitForEmit("join_match");
    await chatTab(page).click();
    await chat.send("Último mensaje");

    await expect(page.getByText("El partido no está activo, la tribuna está cerrada")).toBeVisible();
  });
});
