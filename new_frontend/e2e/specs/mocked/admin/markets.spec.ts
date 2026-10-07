import { expect, test } from "../../../fixtures/test";
import { buildMarket, buildOption } from "../../../factories/bets";
import type { MockRequest } from "../../../support/api-mock";
import { mockAdminPanel } from "../../../support/admin";

/** Como el ValidationPipe del backend (forbidNonWhitelisted): rechaza campos que el DTO no declara. */
function validateCreateMarket(req: MockRequest) {
  const body = req.body as { options: Record<string, unknown>[] };
  const extra = body.options.flatMap((option) => Object.keys(option).filter((key) => !["name", "initialProb"].includes(key)));
  if (extra.length > 0) {
    return { status: 400, body: { statusCode: 400, message: extra.map((key) => `property ${key} should not exist`) } };
  }
  return { status: 201, body: buildMarket({ title: (req.body as { title: string }).title }) };
}

test.describe("Admin: mercados de apuestas", () => {
  test.beforeEach(async ({ api, session }) => {
    session.loginAs("ADMIN");
    mockAdminPanel(api);
  });

  test("crear un mercado manual lo publica con el payload del contrato", { tag: "@p0" }, async ({ app, page, api }) => {
    api.handle("POST", "/bets/admin/markets", validateCreateMarket);

    await app.open();
    await app.goToSection("Admin");
    await page.getByRole("tab", { name: /Apuestas/ }).click();
    await page.getByRole("button", { name: "Crear Mercado Manual" }).click();
    const modal = page.getByRole("dialog", { name: "Crear Mercado de Apuestas" });
    await modal.getByLabel("Título del Mercado *").fill("¿Hay gol antes del minuto 10?");
    await modal.getByRole("textbox", { name: "Opción 1" }).fill("Sí");
    await modal.getByRole("textbox", { name: "Opción 2" }).fill("No");
    await modal.getByRole("button", { name: "Quitar opción 3" }).click();
    await modal.getByRole("spinbutton", { name: "Probabilidad inicial de la opción 1" }).fill("30");
    await modal.getByRole("spinbutton", { name: "Probabilidad inicial de la opción 2" }).fill("70");
    await modal.getByRole("button", { name: "Crear Mercado" }).click();

    await expect(page.getByText("Mercado creado y publicado exitosamente")).toBeVisible();
    expect(api.lastRequest("POST", "/bets/admin/markets")?.body).toMatchObject({
      title: "¿Hay gol antes del minuto 10?",
      type: "CUSTOM",
      options: [
        { name: "Sí", initialProb: 30 },
        { name: "No", initialProb: 70 },
      ],
    });
  });

  test("un mercado de partido con clubes manda los escudos en metadata y opciones válidas", { tag: "@p0" }, async ({ app, page, api }) => {
    api.handle("POST", "/bets/admin/markets", validateCreateMarket);

    await app.open();
    await app.goToSection("Admin");
    await page.getByRole("tab", { name: /Apuestas/ }).click();
    await page.getByRole("button", { name: "Crear Mercado Manual" }).click();
    const modal = page.getByRole("dialog", { name: "Crear Mercado de Apuestas" });
    await modal.getByLabel("Título del Mercado *").fill("Boca vs River - Resultado");
    await modal.getByLabel("Tipo de Mercado").selectOption("MATCH");

    for (const [index, club] of [[1, "Boca Juniors"], [3, "River Plate"]] as const) {
      await modal.getByRole("button", { name: `Asignar club a la opción ${index}` }).click();
      const picker = page.getByRole("dialog", { name: "Elegí un Club" });
      await picker.getByRole("textbox", { name: "Buscar club" }).fill(club.split(" ")[0]);
      await picker.getByRole("button", { name: club }).click();
      await expect(picker).toBeHidden();
    }
    await modal.getByRole("button", { name: "Crear Mercado" }).click();

    await expect(page.getByText("Mercado creado y publicado exitosamente")).toBeVisible();
    expect(api.lastRequest("POST", "/bets/admin/markets")?.body).toMatchObject({
      type: "MATCH",
      metadata: {
        homeTeam: { name: "Boca Juniors", short: "BOC", logoUrl: "451" },
        awayTeam: { name: "River Plate", short: "RIV", logoUrl: "435" },
      },
      options: [
        { name: "Boca Juniors", initialProb: 33 },
        { name: "Empate", initialProb: 34 },
        { name: "River Plate", initialProb: 33 },
      ],
    });
  });

  // GET /bets/markets solo devuelve mercados OPEN: es lo único que el panel puede liquidar hoy.
  test("liquidar un mercado declara la opción ganadora", { tag: "@p0" }, async ({ app, page, api }) => {
    const market = buildMarket({
      title: "¿Quién gana el Superclásico?",
      options: [buildOption({ name: "Boca", totalStaked: 3000 }), buildOption({ name: "River", totalStaked: 2000 })],
    });
    api.on("GET", "/bets/markets", [market]);
    api.on("POST", "/bets/admin/markets/:id/settle", { ...market, status: "SETTLED" });

    await app.open();
    await app.goToSection("Admin");
    await page.getByRole("tab", { name: /Apuestas/ }).click();
    await page.getByRole("article", { name: market.title }).getByRole("button", { name: "Liquidar / Resolver" }).click();
    const modal = page.getByRole("dialog", { name: "Liquidar Mercado de Apuestas" });
    await modal.getByRole("radio", { name: "River" }).check();
    await modal.getByRole("button", { name: "Confirmar Liquidación" }).click();

    await expect(page.getByText("Mercado liquidado y premios repartidos")).toBeVisible();
    const settle = api.lastRequest("POST", "/bets/admin/markets/:id/settle");
    expect(settle?.path).toBe(`/bets/admin/markets/${market.id}/settle`);
    expect(settle?.body).toEqual({ status: "SETTLED", winningOptionId: market.options[1].id });
  });

  test("reembolsar un mercado no manda opción ganadora", async ({ app, page, api }) => {
    const market = buildMarket({ title: "Partido suspendido" });
    api.on("GET", "/bets/markets", [market]);
    api.on("POST", "/bets/admin/markets/:id/settle", { ...market, status: "REFUNDED" });

    await app.open();
    await app.goToSection("Admin");
    await page.getByRole("tab", { name: /Apuestas/ }).click();
    await page.getByRole("article", { name: market.title }).getByRole("button", { name: "Liquidar / Resolver" }).click();
    const modal = page.getByRole("dialog", { name: "Liquidar Mercado de Apuestas" });
    await modal.getByRole("button", { name: /REFUNDED/ }).click();
    await expect(modal).toContainText("Se devolverán las monedas");
    await modal.getByRole("button", { name: "Confirmar Liquidación" }).click();

    await expect(page.getByText("Mercado reembolsado correctamente")).toBeVisible();
    expect(api.lastRequest("POST", "/bets/admin/markets/:id/settle")?.body).toEqual({ status: "REFUNDED" });
  });
});
