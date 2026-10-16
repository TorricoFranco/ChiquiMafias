import { expect, test } from "../../../fixtures/test";
import { buildMatchMarket, buildOption } from "../../../factories/bets";
import { BetsPage } from "../../../pages/bets-page";

test.describe("Cabecera de partidos con escudos", () => {
  test.beforeEach(async ({ session }) => {
    session.loginAs("USER", {}, { balance: 1000 });
  });

  test("con cuatro equipos muestra un escudo por equipo y no el VS", { tag: "@p0" }, async ({ app, page, api }) => {
    const market = buildMatchMarket({
      title: "¿Quién queda mejor posicionado?",
      metadata: null,
      options: [
        buildOption({ name: "Boca Juniors", currentOdds: 2 }),
        buildOption({ name: "River Plate", currentOdds: 2.5 }),
        buildOption({ name: "Racing Club", currentOdds: 3 }),
        buildOption({ name: "Independiente", currentOdds: 4 }),
      ],
    });
    api.on("GET", "/bets/markets", [market]);
    const bets = new BetsPage(page);

    await app.open();
    await app.goToSection("Apuestas");
    const card = bets.market(market.title);

    // Sin metadata, el escudo sale del listado de clubes por nombre.
    await expect(card.getByRole("img", { name: "Racing Club", exact: true })).toHaveAttribute("src", "/escudos-api/436.webp");
    await expect(card.getByRole("img")).toHaveCount(4);
    await expect(card.getByText("VS", { exact: true })).toHaveCount(0);
  });

  test("con tres equipos tampoco pone el VS", { tag: "@p0" }, async ({ app, page, api }) => {
    const market = buildMatchMarket({
      title: "¿Quién termina primero?",
      metadata: null,
      options: [
        buildOption({ name: "Boca Juniors", currentOdds: 2 }),
        buildOption({ name: "River Plate", currentOdds: 2.5 }),
        buildOption({ name: "Racing Club", currentOdds: 3 }),
      ],
    });
    api.on("GET", "/bets/markets", [market]);
    const bets = new BetsPage(page);

    await app.open();
    await app.goToSection("Apuestas");
    const card = bets.market(market.title);

    await expect(card.getByRole("img")).toHaveCount(3);
    await expect(card.getByText("VS", { exact: true })).toHaveCount(0);
  });

  test("con empate en el medio sigue mostrando el VS entre los dos equipos", { tag: "@p0" }, async ({ app, page, api }) => {
    const market = buildMatchMarket({
      title: "Boca vs River - Resultado final",
      metadata: null,
      options: [
        buildOption({ name: "Boca Juniors", currentOdds: 2.1 }),
        buildOption({ name: "Empate", currentOdds: 3.2 }),
        buildOption({ name: "River Plate", currentOdds: 2.5 }),
      ],
    });
    api.on("GET", "/bets/markets", [market]);
    const bets = new BetsPage(page);

    await app.open();
    await app.goToSection("Apuestas");
    const card = bets.market(market.title);

    await expect(card.getByText("VS", { exact: true })).toBeVisible();
    await expect(card.getByRole("img")).toHaveCount(2);
    await expect(card.getByRole("img", { name: "Boca Juniors", exact: true })).toBeVisible();
    await expect(card.getByRole("img", { name: "River Plate", exact: true })).toBeVisible();
  });

  test("con dos opciones sigue mostrando el VS entre los dos escudos", { tag: "@p0" }, async ({ app, page, api }) => {
    const market = buildMatchMarket({
      options: [buildOption({ name: "Boca Juniors", currentOdds: 2 }), buildOption({ name: "River Plate", currentOdds: 2.5 })],
    });
    api.on("GET", "/bets/markets", [market]);
    const bets = new BetsPage(page);

    await app.open();
    await app.goToSection("Apuestas");
    const card = bets.market(market.title);

    await expect(card.getByText("VS", { exact: true })).toBeVisible();
    await expect(card.getByRole("img", { name: "Boca Juniors", exact: true })).toBeVisible();
    await expect(card.getByRole("img", { name: "River Plate", exact: true })).toBeVisible();
  });
});
