import { expect, test } from "../../../fixtures/test";
import { buildMarket } from "../../../factories/bets";

test.describe("Apuestas: carga, error y reintento de los mercados", () => {
  test.beforeEach(async ({ session }) => {
    session.loginAs("USER", {}, { balance: 1000 });
  });

  test("mientras cargan, el tab muestra el esqueleto del grid y los filtros sin un conteo falso", async ({ app, page, api }) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const market = buildMarket({ title: "Mercado que llega después" });
    api.on("GET", "/bets/markets", async () => {
      await gate;
      return [market];
    });

    await app.open();
    await app.goToSection("Apuestas");

    try {
      await expect(page.getByRole("status").filter({ hasText: "Cargando apuestas" })).toBeAttached();
      // Mientras carga, el filtro no dice "Todos (0)": su conteo es un bloque que pulsa.
      await expect(page.getByRole("button", { name: "Todos", exact: true })).toBeVisible();
    } finally {
      release();
    }

    await expect(page.getByRole("article", { name: market.title })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "Cargando apuestas" })).toHaveCount(0);
  });

  test("si los mercados no cargan, muestra el error con reintento y el reintento los recupera", async ({ app, page, api }) => {
    let failing = true;
    const market = buildMarket({ title: "Mercado recuperado" });
    api.handle("GET", "/bets/markets", () =>
      failing ? { status: 500, body: { message: "Error interno" } } : { status: 200, body: [market] },
    );

    await app.open();
    await app.goToSection("Apuestas");

    // TanStack Query reintenta antes de dar el error, así que el aviso tarda unos segundos.
    const alert = page.getByRole("alert").filter({ hasText: "No pudimos cargar los mercados" });
    await expect(alert).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("No hay mercados abiertos en esta categoría por ahora.")).toHaveCount(0);
    // Sin datos, los filtros no muestran un conteo de 0 que parezca real.
    // Los tres filtros existen con su nombre exacto: sin "(n)" detrás. El ticket también tiene un "(0)" en su botón.
    await expect(page.getByRole("button", { name: /^(Todos|Partidos|Especiales)$/ })).toHaveCount(3);

    failing = false;
    await alert.getByRole("button", { name: "Reintentar" }).click();

    await expect(page.getByRole("article", { name: market.title })).toBeVisible();
    await expect(alert).toHaveCount(0);
  });
});
