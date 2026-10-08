import { expect, test } from "../../../fixtures/test";
import { buildMarket, buildOption } from "../../../factories/bets";

test.describe("Apuesta directa desde el carrusel del chat", () => {
  test.beforeEach(async ({ session }) => {
    session.loginAs("USER", {}, { balance: 1000 });
  });

  // El carrusel vive en la barra derecha, que solo existe en escritorio.
  test("elegir cuota y monto envía la apuesta al instante", { tag: "@p0" }, async ({ app, page, api }) => {
    const market = buildMarket({ options: [buildOption({ name: "Boca", currentOdds: 2 }), buildOption({ name: "River", currentOdds: 2.5 })] });
    const river = market.options[1];
    api.on("GET", "/bets/markets", [market]);
    api.on("POST", "/bets/place", { status: "ok" });

    await app.open();
    await page.getByRole("tab", { name: "Apuestas" }).click();
    const card = page.getByRole("article", { name: market.title });
    await card.getByRole("button", { name: /^River / }).click();
    await card.getByLabel("Monto a apostar").fill("150");

    await expect(card).toContainText("Potencial: $375.00");
    await card.getByRole("button", { name: "Apostar" }).click();

    await expect(page.getByText("¡Apuesta realizada con éxito!")).toBeVisible();
    expect(api.lastRequest("POST", "/bets/place")?.body).toEqual({ marketId: market.id, optionId: river.id, stake: 150 });
  });

  test("si el backend rechaza la apuesta muestra el motivo", async ({ app, page, api }) => {
    const market = buildMarket();
    api.on("GET", "/bets/markets", [market]);
    api.on("POST", "/bets/place", { statusCode: 400, message: ["Saldo insuficiente para esta apuesta"] }, { status: 400 });

    await app.open();
    await page.getByRole("tab", { name: "Apuestas" }).click();
    const card = page.getByRole("article", { name: market.title });
    await card.getByRole("button", { name: /^Boca / }).click();
    await card.getByLabel("Monto a apostar").fill("5000");
    await card.getByRole("button", { name: "Apostar" }).click();

    await expect(page.getByText("Saldo insuficiente para esta apuesta")).toBeVisible();
  });

  test("con varios mercados se puede elegir cuál ver", async ({ app, page, api }) => {
    const first = buildMarket({ title: "Primer mercado destacado" });
    const second = buildMarket({ title: "Segundo mercado destacado" });
    api.on("GET", "/bets/markets", [first, second]);

    await app.open();
    await page.getByRole("tab", { name: "Apuestas" }).click();
    await expect(page.getByRole("article", { name: first.title })).toBeVisible();

    await page.getByRole("button", { name: "Ver mercado 2 de 2" }).click();

    await expect(page.getByRole("article", { name: second.title })).toBeVisible();
  });
});
