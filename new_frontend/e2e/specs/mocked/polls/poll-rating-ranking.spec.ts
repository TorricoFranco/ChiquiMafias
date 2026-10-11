import { expect, test } from "../../../fixtures/test";
import { buildPoll } from "../../../factories/polls";

const ratingPoll = () =>
  buildPoll({
    type: "RATING",
    title: "¿Qué nota le ponés al arbitraje?",
    config: { scale: 5 },
    options: [1, 2, 3, 4, 5].map((id) => ({ id, label: String(id), votes: 0 })),
    totalVotes: 40,
  });

const rankingPoll = (overrides = {}) =>
  buildPoll({
    type: "RANKING",
    title: "Armá tu podio de los históricos",
    config: { picks: 3 },
    options: [
      { id: 1, label: "Messi", votes: 0 },
      { id: 2, label: "Maradona", votes: 0 },
      { id: 3, label: "Riquelme", votes: 0 },
      { id: 4, label: "Tévez", votes: 0 },
    ],
    totalVotes: 12,
    ...overrides,
  });

test.describe("Puntuación con estrellas", () => {
  test("al puntuar se ve el promedio y la distribución", async ({ app, page, api, session, socket }) => {
    session.loginAs("USER");
    const poll = ratingPoll();
    api.on("GET", "/polls/active", [poll]);
    socket.onEmit("castVote", () => ({ status: "success" }));

    await app.open();
    await app.goToSection("Pronósticos");

    const card = page.getByRole("article", { name: poll.title });
    await expect(card).toContainText("PUNTUACIÓN");
    await expect(card).toContainText("Poné tu nota");

    await card.getByRole("button", { name: "4 estrellas" }).click();

    expect(await socket.waitForEmit("castVote")).toMatchObject({
      pollId: poll.id,
      optionId: 4,
    });

    // 2 votos de 5 y 3 de 4 → (10 + 12) / 5 = 4,4
    await socket.emit(`votoActualizado_${poll.id}`, { "4": "3", "5": "2" });

    await expect(card).toContainText("4.4");
    await expect(card).toContainText("de 5");
  });

  test("una estrella se nombra en singular", async ({ app, page, api, session }) => {
    session.loginAs("USER");
    const poll = ratingPoll();
    api.on("GET", "/polls/active", [poll]);

    await app.open();
    await app.goToSection("Pronósticos");

    const card = page.getByRole("article", { name: poll.title });
    await expect(card.getByRole("button", { name: "1 estrella" })).toBeVisible();
  });
});

test.describe("Ranking de podio", () => {
  test("hay que elegir las tres antes de poder enviar", async ({ app, page, api, session }) => {
    session.loginAs("USER");
    const poll = rankingPoll();
    api.on("GET", "/polls/active", [poll]);

    await app.open();
    await app.goToSection("Pronósticos");

    const card = page.getByRole("article", { name: poll.title });
    await expect(card).toContainText("RANKING");

    const submit = card.getByRole("button", { name: /Elegí 3 más/ });
    await expect(submit).toBeDisabled();

    await card.getByRole("button", { name: "Messi" }).click();
    await expect(card.getByRole("button", { name: /Elegí 2 más/ })).toBeDisabled();

    await card.getByRole("button", { name: "Riquelme" }).click();
    await card.getByRole("button", { name: "Tévez" }).click();

    await expect(card.getByRole("button", { name: "Enviar mi podio" })).toBeEnabled();
  });

  test("tocar una opción ya elegida la saca del podio", async ({ app, page, api, session }) => {
    session.loginAs("USER");
    const poll = rankingPoll();
    api.on("GET", "/polls/active", [poll]);

    await app.open();
    await app.goToSection("Pronósticos");

    const card = page.getByRole("article", { name: poll.title });
    const messi = card.getByRole("button", { name: "Messi" });

    await messi.click();
    await expect(messi).toHaveAttribute("aria-pressed", "true");

    await messi.click();
    await expect(messi).toHaveAttribute("aria-pressed", "false");
    await expect(card.getByRole("button", { name: /Elegí 3 más/ })).toBeDisabled();
  });

  test("enviar el podio manda las opciones en orden", async ({ app, page, api, session, socket }) => {
    session.loginAs("USER");
    const poll = rankingPoll();
    api.on("GET", "/polls/active", [poll]);
    socket.onEmit("castVote", () => ({ status: "success" }));

    await app.open();
    await app.goToSection("Pronósticos");

    const card = page.getByRole("article", { name: poll.title });
    await card.getByRole("button", { name: "Riquelme" }).click();
    await card.getByRole("button", { name: "Messi" }).click();
    await card.getByRole("button", { name: "Maradona" }).click();
    await card.getByRole("button", { name: "Enviar mi podio" }).click();

    expect(await socket.waitForEmit("castVote")).toMatchObject({
      pollId: poll.id,
      ranking: [3, 1, 2],
    });
  });

  test("al votar se ve cuántas veces quedó cada uno en cada puesto", async ({ app, page, api, session, socket }) => {
    session.loginAs("USER");
    const poll = rankingPoll({
      userVotedOptionId: 1,
      userRanking: [1, 2, 3],
      rankingResults: {
        "1": [7, 2, 1],
        "2": [3, 6, 2],
        "3": [1, 3, 5],
        "4": [1, 1, 4],
      },
    });
    api.on("GET", "/polls/active", [poll]);

    await app.open();
    await app.goToSection("Pronósticos");

    const card = page.getByRole("article", { name: poll.title });
    await expect(card).toContainText("Podio de la tribuna");
    await expect(card).toContainText("Los tres números son las veces que quedó 1º, 2º y 3º.");

    // Messi tiene el puntaje más alto (7·3 + 2·2 + 1 = 26), así que va primero.
    await expect(card.getByText("Messi")).toBeVisible();
    await expect(card.getByTitle("7 votos para el puesto 1")).toBeVisible();
    await expect(card.getByTitle("1 voto para el puesto 3")).toBeVisible();

    // La matriz se actualiza en vivo con el evento del gateway.
    await socket.emit(`rankingActualizado_${poll.id}`, {
      "1": [8, 2, 1],
      "2": [3, 6, 2],
      "3": [1, 3, 5],
      "4": [1, 1, 4],
    });

    await expect(card.getByTitle("8 votos para el puesto 1")).toBeVisible();
  });

  test("sin haber votado no se filtra la matriz de posiciones", async ({ app, page, api, session }) => {
    session.loginAs("USER");
    const poll = rankingPoll();
    api.on("GET", "/polls/active", [poll]);

    await app.open();
    await app.goToSection("Pronósticos");

    const card = page.getByRole("article", { name: poll.title });
    await expect(card).toContainText("12 votos");
    await expect(card).not.toContainText("Podio de la tribuna");
  });
});
