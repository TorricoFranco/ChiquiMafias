import { expect, test } from "../../../fixtures/test";
import { buildMarket, buildMatchMarket, buildOption } from "../../../factories/bets";
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

  test("un mercado manual muestra el escudo que tiene cada opción, aunque el nombre no sea un club", { tag: "@p0" }, async ({ app, page, api }) => {
    const market = buildMarket({
      title: "¿Quién marca primero?",
      type: "MATCH",
      isManual: true,
      options: [
        buildOption({ name: "Ronaldo Martinez", logoUrl: "435" }),
        buildOption({ name: "Álex Arce", logoUrl: "436" }),
        buildOption({ name: "Junior Marabel", logoUrl: "453" }),
        buildOption({ name: "Huracán" }),
      ],
    });
    api.on("GET", "/bets/markets", [market]);
    const bets = new BetsPage(page);

    await app.open();
    await app.goToSection("Apuestas");
    const card = bets.market(market.title);

    await expect(card.getByRole("img", { name: "Ronaldo Martinez", exact: true })).toHaveAttribute("src", "/escudos-api/435.webp");
    await expect(card.getByRole("img", { name: "Junior Marabel", exact: true })).toHaveAttribute("src", "/escudos-api/453.webp");
    await expect(card.getByRole("img")).toHaveCount(4);
    await expect(card.getByText("VS", { exact: true })).toHaveCount(0);
  });

  // Un mercado manual viejo con la metadata que armaba el admin por posición: los jugadores no tienen escudo.
  test("un mercado manual con metadata de clubes no pinta escudos sobre jugadores", { tag: "@p0" }, async ({ app, page, api }) => {
    const market = buildMarket({
      title: "¿Qué jugador marcará primero?",
      type: "MATCH",
      isManual: true,
      metadata: {
        homeTeam: { name: "Ronaldo Martinez", short: "RON", logoUrl: "438" },
        awayTeam: { name: "Huracán", short: "HUR", logoUrl: "445" },
      },
      options: [
        buildOption({ name: "Ronaldo Martinez" }),
        buildOption({ name: "Álex Arce" }),
        buildOption({ name: "Huracán" }),
        buildOption({ name: "Junior Marabel" }),
      ],
    });
    api.on("GET", "/bets/markets", [market]);
    const bets = new BetsPage(page);

    await app.open();
    await app.goToSection("Apuestas");
    const card = bets.market(market.title);

    await expect(card.getByRole("button", { name: /^Ronaldo Martinez / })).toBeVisible();
    await expect(card.getByRole("img")).toHaveCount(0);
    await expect(card.getByText("VS", { exact: true })).toHaveCount(0);
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

  test("un equipo sin ID de API-Football muestra su escudo de Cloudinary", async ({ app, page, api }) => {
    const cloudinaryBadge = "https://res.cloudinary.com/chiqui/image/upload/team-badges/team_midland.png";
    const market = buildMatchMarket({
      title: "Midland vs Huracán - Copa Argentina",
      metadata: {
        homeTeam: { name: "Midland", short: "MID", logoUrl: cloudinaryBadge },
        awayTeam: { name: "Huracán", short: "HUR", logoUrl: "445" },
      },
      options: [
        buildOption({ name: "Midland", logoUrl: cloudinaryBadge }),
        buildOption({ name: "Empate" }),
        buildOption({ name: "Huracán", logoUrl: "445" }),
      ],
    });
    api.on("GET", "/bets/markets", [market]);
    const bets = new BetsPage(page);

    await app.open();
    await app.goToSection("Apuestas");
    const card = bets.market(market.title);

    await expect(card.getByRole("img", { name: "Midland", exact: true })).toHaveAttribute("src", cloudinaryBadge);
    await expect(card.getByRole("img", { name: "Huracán", exact: true })).toHaveAttribute("src", "/escudos-api/445.webp");
  });
});
