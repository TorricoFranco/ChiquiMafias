import { expect, test } from "../../../fixtures/test";
import { buildPoll } from "../../../factories/polls";

// El carrusel de la barra derecha carga la lista una vez; después la encuesta nueva llega por el chat.
test.describe("Votar desde el chat con la lista de encuestas ya cacheada", () => {
  test("la encuesta que llegó por el chat queda enfocada aunque la lista cacheada no la tenía", { tag: "@p0" }, async ({ app, page, api, session, socket }) => {
    session.loginAs("USER");
    const others = [buildPoll({ title: "Encuesta de relleno" })];
    const fresh = buildPoll({ title: "La encuesta del chat" });
    let active = others;
    api.on("GET", "/polls/active", () => active);

    await app.open();
    await socket.waitForConnection();
    await page.getByRole("tab", { name: "Apuestas" }).click();
    await expect.poll(() => api.requests("GET", "/polls/active").length).toBe(1);

    // A partir de acá el servidor ya tiene la encuesta nueva; la cache del cliente todavía no.
    active = [...others, fresh];
    await socket.emit("poll_show", { id: fresh.id, title: fresh.title, timestamp: Date.now() });
    await page.getByRole("button", { name: "Votar", exact: true }).click();

    const card = page.getByRole("article", { name: fresh.title });
    await expect(card).toBeFocused();
    await expect(card).toHaveCSS("outline-width", "2px");
  });
});
