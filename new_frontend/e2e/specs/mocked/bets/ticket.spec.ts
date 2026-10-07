import { expect, test } from "../../../fixtures/test";
import { buildMarket, buildMatchMarket, buildOption } from "../../../factories/bets";
import { BetsPage } from "../../../pages/bets-page";

test.describe("Ticket de apuestas", () => {
  test.beforeEach(async ({ session }) => {
    session.loginAs("USER", {}, { balance: 1000 });
  });

  test("una cuota agregada al ticket calcula el retorno potencial", { tag: "@p0" }, async ({ app, page, api }) => {
    const market = buildMarket({ options: [buildOption({ name: "Boca", currentOdds: 2.1 }), buildOption({ name: "River", currentOdds: 2.5 })] });
    api.on("GET", "/bets/markets", [market]);
    const bets = new BetsPage(page);

    await app.open();
    await app.goToSection("Pronósticos");
    await bets.option(market.title, "Boca").click();

    await expect(bets.option(market.title, "Boca")).toHaveAttribute("aria-pressed", "true");
    await expect(bets.amountFor("Boca")).toHaveValue("100");
    await expect(bets.ticket).toContainText("210.00");

    await bets.amountFor("Boca").fill("300");
    await expect(bets.ticket).toContainText("630.00");
    await expect(bets.confirmButton).toHaveAccessibleName("Confirmar (300)");
  });

  test("con saldo insuficiente no deja confirmar", { tag: "@p0" }, async ({ app, page, api, session }) => {
    session.balance = 50;
    const market = buildMarket();
    api.on("GET", "/bets/markets", [market]);
    const bets = new BetsPage(page);

    await app.open();
    await app.goToSection("Pronósticos");
    await bets.option(market.title, "Boca").click();

    await expect(bets.ticket.getByText(/Saldo insuficiente/)).toBeVisible();
    await expect(bets.confirmButton).toBeDisabled();
  });

  test("confirmar envía una apuesta por selección y vacía el ticket", { tag: ["@p0", "@mobile"] }, async ({ app, page, api }) => {
    const superclasico = buildMatchMarket();
    const goleador = buildMarket({
      title: "¿Quién es el goleador del torneo?",
      options: [buildOption({ name: "Cavani", currentOdds: 4 }), buildOption({ name: "Borja", currentOdds: 3 })],
    });
    api.on("GET", "/bets/markets", [superclasico, goleador]);
    api.on("POST", "/bets/place", { status: "ok", message: "Apuesta registrada" });
    const bets = new BetsPage(page);

    await app.open();
    await app.goToSection("Pronósticos");
    await bets.option(superclasico.title, "Boca").click();
    await bets.option(goleador.title, "Cavani").click();
    await bets.showTicket();
    await bets.amountFor("Cavani").fill("250");
    await bets.confirmButton.click();

    await expect(page.getByText("¡Apuestas confirmadas con éxito!")).toBeVisible();
    await expect(bets.amountFor("Boca")).toBeHidden();
    await expect(bets.amountFor("Cavani")).toBeHidden();
    expect(api.requests("POST", "/bets/place").map((req) => req.body)).toEqual([
      { marketId: superclasico.id, optionId: superclasico.options[0].id, stake: 100 },
      { marketId: goleador.id, optionId: goleador.options[0].id, stake: 250 },
    ]);
  });

  test("si falla una apuesta, en el ticket quedan solo las que no se hicieron", { tag: "@p0" }, async ({ app, page, api }) => {
    const first = buildMarket({ title: "Primer mercado" });
    const second = buildMarket({ title: "Segundo mercado" });
    api.on("GET", "/bets/markets", [first, second]);
    api.handle("POST", "/bets/place", (req) =>
      (req.body as { marketId: string }).marketId === second.id
        ? { status: 400, body: { statusCode: 400, message: "El mercado ya está cerrado" } }
        : { body: { status: "ok" } },
    );
    const bets = new BetsPage(page);

    await app.open();
    await app.goToSection("Pronósticos");
    await bets.option(first.title, "Boca").click();
    await bets.option(second.title, "River").click();
    await bets.confirmButton.click();

    await expect(page.getByText("El mercado ya está cerrado")).toBeVisible();
    await expect(bets.amountFor("River")).toBeVisible();
    await expect(bets.amountFor("Boca"), "la apuesta ya hecha no puede volver a enviarse").toBeHidden();
  });

  test("un mercado cerrado no permite elegir cuotas", { tag: "@p0" }, async ({ app, page, api }) => {
    const market = buildMarket({ status: "LOCKED" });
    api.on("GET", "/bets/markets", [market]);
    const bets = new BetsPage(page);

    await app.open();
    await app.goToSection("Pronósticos");

    await expect(bets.market(market.title).getByText("MERCADO CERRADO")).toBeVisible();
    await expect(bets.option(market.title, "Boca")).toBeDisabled();
  });

  test("los filtros separan partidos de especiales", async ({ app, page, api }) => {
    const match = buildMatchMarket();
    const special = buildMarket({ title: "¿Renuncia el DT antes de la fecha 10?" });
    api.on("GET", "/bets/markets", [match, special]);
    const bets = new BetsPage(page);

    await app.open();
    await app.goToSection("Pronósticos");
    await bets.filter(/Partidos \(1\)/).click();

    await expect(bets.market(match.title)).toBeVisible();
    await expect(bets.market(special.title)).toBeHidden();

    await bets.filter(/Especiales \(1\)/).click();
    await expect(bets.market(special.title)).toBeVisible();
    await expect(bets.market(match.title)).toBeHidden();
  });
});

test.describe("Mercados en vivo", () => {
  test.beforeEach(async ({ session }) => {
    session.loginAs("USER", {}, { balance: 1000 });
  });

  test("las cuotas se actualizan cuando cambia el pozo", { tag: "@p0" }, async ({ app, page, api, socket }) => {
    const market = buildMarket();
    const boca = market.options[0];
    api.on("GET", "/bets/markets", [market]);
    const bets = new BetsPage(page);

    await app.open();
    await app.goToSection("Pronósticos");
    await expect(bets.option(market.title, "Boca")).toContainText("2.10");

    await socket.emit(
      "market_pool_updated",
      { marketId: market.id, optionId: boca.id, newTotalStaked: 5000, newOdds: 1.85 },
      { nsp: "/bets" },
    );

    await expect(bets.option(market.title, "Boca")).toContainText("1.85");
    await expect(bets.market(market.title)).toContainText("Pozo total: $5.000");
  });

  test("un mercado nuevo aparece y uno bloqueado se cierra sin recargar", async ({ app, page, api, socket }) => {
    const existing = buildMarket({ title: "Mercado existente" });
    const created = buildMarket({ title: "Mercado recién creado" });
    api.on("GET", "/bets/markets", [existing]);
    const bets = new BetsPage(page);

    await app.open();
    await app.goToSection("Pronósticos");
    await expect(bets.market(existing.title)).toBeVisible();

    await socket.emit("market_created", created, { nsp: "/bets" });
    await socket.emit("market_status_changed", { marketId: existing.id, status: "LOCKED" }, { nsp: "/bets" });

    await expect(bets.market(created.title)).toBeVisible();
    await expect(bets.market(existing.title).getByText("MERCADO CERRADO")).toBeVisible();
  });

  test("el saldo del header refleja lo que informa el backend", { tag: "@p0" }, async ({ app, socket }) => {
    await app.open();
    await expect(app.balance).toContainText("1.000");

    await socket.emit("wallet:balance_updated", { balance: 750 });

    await expect(app.balance).toContainText("750");
  });
});
