import { expect, test } from "../../../fixtures/test";
import { buildComment, buildPoll, paginatedComments } from "../../../factories/polls";

// El carrusel vive en la barra derecha, que solo existe en escritorio.
test.describe("Carrusel de encuestas de la barra derecha", () => {
  test("muestra como máximo 6 encuestas", async ({ app, page, api, session }) => {
    session.loginAs("USER");
    const polls = Array.from({ length: 8 }, (_, index) => buildPoll({ title: `Encuesta ${index + 1} del carrusel` }));
    api.on("GET", "/polls/active", polls);

    await app.open();
    await page.getByRole("tab", { name: "Apuestas" }).click();

    await expect(page.getByRole("button", { name: "Ver encuesta 1 de 6" })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Ver encuesta \d de 6$/ })).toHaveCount(6);
    await expect(page.getByRole("button", { name: /^Ver encuesta \d de 8$/ })).toHaveCount(0);

    await page.getByRole("button", { name: "Ver encuesta 6 de 6" }).click();
    await expect(page.getByText("Encuesta 6 del carrusel")).toBeVisible();
  });

  test("Comentar lleva a esa encuesta en Pronósticos con sus comentarios abiertos", async ({ app, page, api, session }) => {
    session.loginAs("USER");
    // Es la sexta del carrusel: en el feed queda debajo del pliegue, así que hay que scrollear.
    const others = Array.from({ length: 5 }, (_, index) => buildPoll({ title: `Encuesta ${index + 1} de relleno` }));
    const target = buildPoll({ title: "La encuesta que se comenta" });
    const comment = buildComment({ pollId: target.id, text: "Esto lo tiene que ver el feed" });
    api.on("GET", "/polls/active", [...others, target]);
    api.on("GET", "/polls/:id/comments", () => paginatedComments([comment]));

    await app.open();
    await page.getByRole("tab", { name: "Apuestas" }).click();
    await page.getByRole("button", { name: "Ver encuesta 6 de 6" }).click();
    await expect(page.getByText("La encuesta que se comenta")).toBeVisible();
    await page.getByRole("button", { name: "Comentar", exact: true }).click();

    const card = page.getByRole("article", { name: target.title });
    // El resalte dura dos segundos: se mira primero.
    await expect(card).toHaveCSS("outline-width", "2px");
    await expect(card).toHaveCSS("outline-style", "solid");
    await expect(card).toBeFocused();
    await expect(card).toBeInViewport({ ratio: 0.5 });
    await expect(card.getByText("Esto lo tiene que ver el feed")).toBeVisible();
    // Y después se apaga solo: no queda una encuesta resaltada para siempre.
    await expect(card).not.toHaveCSS("outline-width", "2px", { timeout: 4000 });
  });

  test("Ver más lleva a la encuesta sin abrir sus comentarios", async ({ app, page, api, session }) => {
    session.loginAs("USER");
    const target = buildPoll({ title: "Encuesta para ver más" });
    api.on("GET", "/polls/active", [target]);
    api.on("GET", "/polls/:id/comments", () =>
      paginatedComments([buildComment({ pollId: target.id, text: "Comentario que no se abre" })]),
    );

    await app.open();
    await page.getByRole("tab", { name: "Apuestas" }).click();
    await page.getByRole("button", { name: "Ver más" }).click();

    const card = page.getByRole("article", { name: target.title });
    await expect(card).toBeInViewport();
    await expect(card.getByRole("button", { name: "0 Comentarios" })).toHaveAttribute("aria-expanded", "false");
    await expect(card.getByText("Comentario que no se abre")).toHaveCount(0);
  });

  test("el Votar del chat muestra en el carrusel una encuesta que está entre las primeras 6", async ({ app, page, api, session, socket }) => {
    session.loginAs("USER");
    const first = buildPoll({ title: "Primera del carrusel" });
    const second = buildPoll({ title: "Segunda, la que llega desde el chat" });
    api.on("GET", "/polls/active", [first, second]);

    await app.open();
    await page.getByRole("tab", { name: "Apuestas" }).click();
    await socket.waitForConnection();
    await socket.emit("poll_show", { id: second.id, title: second.title, timestamp: Date.now() });
    await page.getByRole("button", { name: "Votar", exact: true }).click();

    await expect(page.getByRole("button", { name: "Ver encuesta 2 de 2" })).toHaveAttribute("aria-current", "true");
    await expect(page.getByText("Segunda, la que llega desde el chat")).toBeVisible();
  });

  test("el Votar del chat lleva a una encuesta que quedó fuera de las 6 del carrusel", async ({ app, page, api, session, socket }) => {
    session.loginAs("USER");
    const others = Array.from({ length: 6 }, (_, index) => buildPoll({ title: `Encuesta ${index + 1} del carrusel` }));
    const outside = buildPoll({ title: "La encuesta número siete" });
    api.on("GET", "/polls/active", [...others, outside]);

    await app.open();
    await page.getByRole("tab", { name: "Apuestas" }).click();
    await socket.waitForConnection();
    await socket.emit("poll_show", { id: outside.id, title: outside.title, timestamp: Date.now() });
    await page.getByRole("button", { name: "Votar", exact: true }).click();

    const card = page.getByRole("article", { name: outside.title });
    await expect(card).toBeFocused();
    await expect(card).toBeInViewport({ ratio: 0.5 });
  });
});
