import { expect, test } from "../../../fixtures/test";
import { buildPoll } from "../../../factories/polls";

/** Encuesta como la manda el backend a quien todavía no votó: opciones en cero y el total aparte. */
const hiddenResultsPoll = (overrides = {}) =>
  buildPoll({
    options: [
      { id: 1, label: "Boca", votes: 0 },
      { id: 2, label: "River", votes: 0 },
    ],
    totalVotes: 128,
    ...overrides,
  });

test.describe("Tipos de encuesta", () => {
  test("antes de votar se ve cuántos votaron pero no el reparto", async ({ app, page, api, session }) => {
    session.loginAs("USER");
    const poll = hiddenResultsPoll();
    api.on("GET", "/polls/active", [poll]);

    await app.open();
    await app.goToSection("Comunidad");

    const card = page.getByRole("article", { name: poll.title });
    await expect(card).toContainText("128 votos");
    await expect(card).not.toContainText("%");
  });

  test("el total se actualiza en vivo sin revelar el reparto", async ({ app, page, api, session, socket }) => {
    session.loginAs("USER");
    const poll = hiddenResultsPoll();
    api.on("GET", "/polls/active", [poll]);

    await app.open();
    await app.goToSection("Comunidad");

    const card = page.getByRole("article", { name: poll.title });
    await expect(card).toContainText("128 votos");

    await socket.emit(`totalActualizado_${poll.id}`, { totalVotes: 129 });

    await expect(card).toContainText("129 votos");
    await expect(card).not.toContainText("%");
  });

  test("un duelo se pinta enfrentado y al votar muestra la barra partida", async ({ app, page, api, session, socket }) => {
    session.loginAs("USER");
    const poll = hiddenResultsPoll({
      type: "VERSUS",
      title: "¿Quién fue mejor?",
      options: [
        { id: 1, label: "Messi", votes: 0 },
        { id: 2, label: "Maradona", votes: 0 },
      ],
    });
    api.on("GET", "/polls/active", [poll]);
    socket.onEmit("castVote", () => ({ status: "success" }));

    await app.open();
    await app.goToSection("Comunidad");

    const card = page.getByRole("article", { name: poll.title });
    await expect(card).toContainText("DUELO");
    await expect(card).toContainText("VS");

    await card.getByRole("button", { name: "Messi" }).click();
    await socket.emit(`votoActualizado_${poll.id}`, { "1": "3", "2": "1" });

    await expect(card).toContainText("Messi 75%");
    await expect(card).toContainText("25% Maradona");
  });

  test("una predicción de partido muestra local, empate y visitante", async ({ app, page, api, session }) => {
    session.loginAs("USER");
    const poll = hiddenResultsPoll({
      type: "MATCH",
      title: "¿Cómo sale el superclásico?",
      config: { layout: "VS" },
      options: [
        { id: 1, label: "Boca", votes: 0, teamId: "451" },
        { id: 2, label: "Empate", votes: 0 },
        { id: 3, label: "River", votes: 0, teamId: "435" },
      ],
    });
    api.on("GET", "/polls/active", [poll]);

    await app.open();
    await app.goToSection("Comunidad");

    const card = page.getByRole("article", { name: poll.title });
    await expect(card).toContainText("PREDICCIÓN");
    await expect(card.getByRole("button", { name: "Empate" })).toBeVisible();
    // Exacto: el autor de la encuesta también tiene escudo ("Escudo de Boca Juniors").
    await expect(card.getByRole("img", { name: "Escudo de Boca", exact: true })).toBeVisible();
  });

  test("un facto se vota con dos botones y después invita a los comentarios", async ({ app, page, api, session, socket }) => {
    session.loginAs("USER");
    const poll = hiddenResultsPoll({
      type: "FACTO",
      title: "Riquelme es el mejor 10 de la historia",
      options: [
        { id: 1, label: "Facto", votes: 0 },
        { id: 2, label: "No facto", votes: 0 },
      ],
    });
    api.on("GET", "/polls/active", [poll]);
    socket.onEmit("castVote", () => ({ status: "success" }));

    await app.open();
    await app.goToSection("Comunidad");

    const card = page.getByRole("article", { name: poll.title });
    await expect(card).toContainText("DEBATE");

    // exact: "Facto" también matchearía "No facto".
    await card.getByRole("button", { name: "Facto", exact: true }).click();
    await socket.emit(`votoActualizado_${poll.id}`, { "1": "8", "2": "2" });

    await expect(card).toContainText("Facto 80%");
  });

  test("una placa informativa no se vota pero se puede comentar y likear", async ({ app, page, api, session }) => {
    session.loginAs("USER");
    const poll = buildPoll({
      type: "INFO",
      title: "Mañana arranca la fecha 15",
      options: [],
      endsAt: null,
    });
    api.on("GET", "/polls/active", [poll]);

    await app.open();
    await app.goToSection("Comunidad");

    const card = page.getByRole("article", { name: poll.title });
    await expect(card).toContainText("INFO");
    await expect(card).toContainText("Aviso de la tribuna");
    await expect(card).not.toContainText("votos");
    await expect(card.getByRole("button", { name: "Me gusta (4)" })).toBeVisible();
    await expect(card.getByRole("button", { name: "0 Comentarios" })).toBeVisible();
  });

  test("una encuesta con los comentarios cerrados no muestra el botón", async ({ app, page, api, session }) => {
    session.loginAs("USER");
    const poll = hiddenResultsPoll({ commentsEnabled: false });
    api.on("GET", "/polls/active", [poll]);

    await app.open();
    await app.goToSection("Comunidad");

    const card = page.getByRole("article", { name: poll.title });
    await expect(card.getByRole("button", { name: "Me gusta (4)" })).toBeVisible();
    await expect(card.getByRole("button", { name: /Comentarios/ })).toHaveCount(0);
  });

  test("el filtro del feed separa las encuestas por tipo", async ({ app, page, api, session }) => {
    session.loginAs("USER");
    const clasica = hiddenResultsPoll({ title: "¿Quién gana la liga?" });
    const duelo = hiddenResultsPoll({
      type: "VERSUS",
      title: "Messi o Maradona",
      options: [
        { id: 1, label: "Messi", votes: 0 },
        { id: 2, label: "Maradona", votes: 0 },
      ],
    });
    api.on("GET", "/polls/active", [clasica, duelo]);

    await app.open();
    await app.goToSection("Comunidad");

    await expect(page.getByRole("article", { name: clasica.title })).toBeVisible();
    await expect(page.getByRole("article", { name: duelo.title })).toBeVisible();

    await page.getByRole("button", { name: "Duelos" }).click();

    await expect(page.getByRole("article", { name: duelo.title })).toBeVisible();
    await expect(page.getByRole("article", { name: clasica.title })).toHaveCount(0);
  });
});
