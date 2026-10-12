import { expect, test } from "../../../fixtures/test";
import { buildMarket } from "../../../factories/bets";
import { buildPoll } from "../../../factories/polls";

// Los carruseles viven en la barra derecha, que solo existe en escritorio.
test.describe("Carruseles de la barra derecha: carga", () => {
  test("mientras cargan, cada carrusel muestra su esqueleto con el título", async ({ app, page, api, session }) => {
    session.loginAs("USER");
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const market = buildMarket({ title: "Mercado que llega después" });
    const poll = buildPoll({ title: "Encuesta que llega después" });
    api.on("GET", "/bets/markets", async () => {
      await gate;
      return [market];
    });
    api.on("GET", "/polls/active", async () => {
      await gate;
      return [poll];
    });

    await app.open();
    await page.getByRole("tab", { name: "Apuestas" }).click();

    try {
      await expect(page.getByRole("status").filter({ hasText: "Cargando mercados" })).toBeAttached();
      await expect(page.getByRole("status").filter({ hasText: "Cargando encuestas" })).toBeAttached();
      await expect(page.getByText("MERCADOS DESTACADOS")).toBeVisible();
      await expect(page.getByText("ENCUESTA DE LA TRIBUNA")).toBeVisible();
    } finally {
      // Si una aserción falla antes, la ruta igual se libera y no queda colgada.
      release();
    }

    await expect(page.getByRole("article", { name: market.title })).toBeVisible();
    await expect(page.getByText(poll.title)).toBeVisible();
  });

  test("el carrusel de encuestas no cambia de altura al llegar los datos", async ({ app, page, api, session }) => {
    session.loginAs("USER");
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const poll = buildPoll({ title: "Encuesta corta" });
    api.on("GET", "/polls/active", async () => {
      await gate;
      return [poll];
    });

    await app.open();
    await page.getByRole("tab", { name: "Apuestas" }).click();
    const loading = await page.getByRole("status").filter({ hasText: "Cargando encuestas" }).boundingBox();
    expect(loading).not.toBeNull();
    release();

    const pollText = page.getByText(poll.title);
    await expect(pollText).toBeVisible();
    // Altura del contenedor del carrusel ya cargado (el de los bordes redondeados de abajo).
    const loaded = await pollText.evaluate((el) => (el.closest(".rounded-b-xl") as HTMLElement).getBoundingClientRect().height);
    expect(Math.abs(loaded - (loading?.height ?? 0))).toBeLessThanOrEqual(20);
  });

  test("los puntos del carrusel tienen 24 píxeles de área para tocar", async ({ app, page, api, session }) => {
    session.loginAs("USER");
    api.on("GET", "/polls/active", [buildPoll({ title: "Primera de dos" }), buildPoll({ title: "Segunda de dos" })]);

    await app.open();
    await page.getByRole("tab", { name: "Apuestas" }).click();

    const dot = page.getByRole("button", { name: "Ver encuesta 2 de 2" });
    await expect(dot).toBeVisible();
    const box = await dot.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(24);
    expect(box?.height).toBeGreaterThanOrEqual(24);
  });
});
