import { expect, test } from "../../../fixtures/test";
import { buildComment, buildPoll, paginatedComments } from "../../../factories/polls";
import { buildInventoryItem } from "../../../factories/store";

test.describe("Encuestas de la tribuna", () => {
  test("votar envía el voto por socket y muestra los resultados en vivo", { tag: ["@p0", "@mobile"] }, async ({ app, page, api, session, socket }) => {
    const user = session.loginAs("USER");
    const poll = buildPoll();
    api.on("GET", "/polls/active", [poll]);
    socket.onEmit("castVote", () => ({ status: "ok" }));

    await app.open();
    await app.goToSection("Pronósticos");
    const card = page.getByRole("article", { name: poll.title });
    await card.getByRole("button", { name: "Boca" }).click();

    expect(await socket.waitForEmit("castVote")).toEqual({ pollId: poll.id, optionId: 1, userId: user.id });
    await expect(card).toContainText("67% (2 v)");

    await socket.emit(`votoActualizado_${poll.id}`, { "1": "3", "2": "1" });
    await expect(card).toContainText("75% (3 v)");
    await expect(card).toContainText("4 votos");
  });

  test("al abrir una encuesta se suscribe a sus resultados", async ({ app, api, session, socket }) => {
    session.loginAs("USER");
    const poll = buildPoll();
    api.on("GET", "/polls/active", [poll]);

    await app.open();
    await app.goToSection("Pronósticos");

    expect(await socket.waitForEmit("joinPoll")).toEqual({ pollId: poll.id });
  });

  test("un visitante que vota ve el login", async ({ app, page, api, socket }) => {
    const poll = buildPoll();
    api.on("GET", "/polls/active", [poll]);

    await app.open();
    await app.goToSection("Pronósticos");
    await socket.waitForConnection();
    await page.getByRole("article", { name: poll.title }).getByRole("button", { name: "River" }).click();

    await expect(page.getByRole("dialog", { name: "Iniciá sesión" })).toBeVisible();
    expect(socket.emitted("castVote")).toHaveLength(0);
  });

  test("si el backend rechaza el voto muestra el motivo", async ({ app, page, api, session, socket }) => {
    session.loginAs("USER");
    const poll = buildPoll();
    api.on("GET", "/polls/active", [poll]);
    socket.onEmit("castVote", () => ({ status: "error", message: "La encuesta ya cerró" }));

    await app.open();
    await app.goToSection("Pronósticos");
    await page.getByRole("article", { name: poll.title }).getByRole("button", { name: "Boca" }).click();

    await expect(page.getByText("La encuesta ya cerró")).toBeVisible();
    await expect(page.getByRole("article", { name: poll.title }).getByRole("button", { name: "Boca" })).toBeVisible();
  });

  test("reaccionar con me gusta lo registra y refresca la encuesta", async ({ app, page, api, session }) => {
    session.loginAs("USER");
    const poll = buildPoll({ likesCount: 4 });
    api.on("GET", "/polls/active", [poll]);
    api.on("POST", "/polls/:id/react", { status: "ok" });

    await app.open();
    await app.goToSection("Pronósticos");
    await page.getByRole("article", { name: poll.title }).getByRole("button", { name: "Me gusta (4)" }).click();

    await expect.poll(() => api.requests("GET", "/polls/active").length).toBeGreaterThan(1);
    expect(api.lastRequest("POST", "/polls/:id/react")?.body).toEqual({ type: "LIKE" });
  });

  test("se pueden leer y agregar comentarios", async ({ app, page, api, session }) => {
    session.loginAs("USER");
    const poll = buildPoll({ stats: { comments: 0, reactions: 0 } });
    const comments = [] as ReturnType<typeof buildComment>[];
    api.on("GET", "/polls/active", [poll]);
    api.on("GET", "/polls/:id/comments", () => paginatedComments(comments));
    api.handle("POST", "/polls/:id/comments", (req) => {
      const comment = buildComment({ pollId: poll.id, text: (req.body as { text: string }).text, user: { id: "me", username: "hincha_e2e" } });
      comments.push(comment);
      return { status: 201, body: comment };
    });

    await app.open();
    await app.goToSection("Pronósticos");
    const card = page.getByRole("article", { name: poll.title });
    await card.getByRole("button", { name: "0 Comentarios" }).click();
    await expect(card.getByText("Sé el primero en opinar...")).toBeVisible();

    await card.getByRole("textbox", { name: "Tu comentario" }).fill("Gana el que tenga más hambre");
    await card.getByRole("button", { name: "Enviar comentario" }).click();

    await expect(card.getByText("Gana el que tenga más hambre")).toBeVisible();
    await expect(card.getByRole("textbox", { name: "Tu comentario" })).toHaveValue("");
  });

  test("reclamar las recompensas suma las monedas al saldo", { tag: "@p0" }, async ({ app, page, api, session }) => {
    session.loginAs("USER", {}, { balance: 1000 });
    api.on("GET", "/polls/rewards/pending", { count: 2, potentialCoins: 150 }, { times: 1 });
    api.on("POST", "/polls/rewards/claim-all", { coinsAwarded: 150 });

    await app.open();
    await app.goToSection("Pronósticos");
    await expect(page.getByText("¡Tenés recompensas sin reclamar!")).toBeVisible();
    await page.getByRole("button", { name: "Reclamar 150" }).click();

    await expect(app.balance).toContainText("1.150");
    await expect(page.getByText("¡Tenés recompensas sin reclamar!")).toBeHidden();
  });

  test("con un ticket de encuesta se puede proponer una a moderación", async ({ app, page, api, session }) => {
    session.loginAs("USER");
    api.on("GET", "/inventory", [buildInventoryItem({ item: { name: "Ticket Encuesta", type: "CUSTOM_POLL", assetId: "custom-poll" } })]);
    api.on("POST", "/polls/propose", buildPoll({ status: "PENDING" }));

    await app.open();
    await app.goToSection("Pronósticos");
    await page.getByRole("button", { name: "Crear encuesta" }).click();
    const modal = page.getByRole("dialog", { name: "Desafiar a la Tribuna" });
    await modal.getByLabel("Pregunta principal *").fill("¿Vuelve Riquelme a jugar?");
    await modal.getByRole("textbox", { name: "Opción 1" }).fill("Sí");
    await modal.getByRole("textbox", { name: "Opción 2" }).fill("No");
    await modal.getByRole("button", { name: "Enviar Propuesta" }).click();

    await expect(page.getByText("¡Encuesta enviada a moderación!")).toBeVisible();
    await expect(modal).toBeHidden();
    expect(api.lastRequest("POST", "/polls/propose")?.body).toEqual({ title: "¿Vuelve Riquelme a jugar?", options: ["Sí", "No"] });
  });

  test("sin tickets no se puede proponer una encuesta", async ({ app, page, session }) => {
    session.loginAs("USER");

    await app.open();
    await app.goToSection("Pronósticos");

    await expect(page.getByRole("button", { name: "Crear encuesta" })).toBeDisabled();
  });
});
