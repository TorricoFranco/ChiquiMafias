import { expect, test } from "../../../fixtures/test";
import {
  buildPriceChangeLogEntry,
  buildPricingCoinPack,
  buildPricingDiscount,
  buildPricingOverview,
  buildPricingPlan,
  buildPricingStoreItem,
} from "../../../factories/admin";
import { mockAdminPanel } from "../../../support/admin";
import type { ApiMock } from "../../../support/api-mock";
import type { MockSession } from "../../../support/session";
import type { PricingOverview } from "@/features/admin/types";

/** Envuelve la respuesta como el backend: `{ status, message, data }`. */
const envelope = (data: unknown, message = "ok") => ({ status: "success", message, data });

/** Sesión de presidente + lo que pide el panel al abrir la pestaña de Precios. */
function asPresident(session: MockSession, api: ApiMock, overview: PricingOverview) {
  session.loginAs("PRESIDENT");
  mockAdminPanel(api);
  api.on("GET", "/pricing/admin", envelope(overview, "Precios vigentes"));
}

test.describe("Panel de precios del presidente", () => {
  test(
    "el presidente cambia el precio de un pack de ChiquiCoins",
    { tag: "@p0" },
    async ({ app, page, api, session }) => {
      const pack = buildPricingCoinPack({ id: "pack-1", name: "Pack Hincha", priceARS: 1500 });
      session.loginAs("PRESIDENT");
      mockAdminPanel(api);

      // Mock con estado: el refetch posterior al guardado trae el precio nuevo,
      // como haría el backend.
      let priceARS = pack.priceARS;
      api.handle("GET", "/pricing/admin", () => ({
        status: 200,
        body: envelope(buildPricingOverview({ coinPacks: [{ ...pack, priceARS }] })),
      }));
      api.handle("PATCH", "/pricing/coin-packs/:id", (req) => {
        priceARS = (req.body as { priceARS: number }).priceARS;
        return {
          status: 200,
          body: envelope(
            { coinPack: { ...pack, priceARS }, change: buildPriceChangeLogEntry() },
            "Precio del pack de monedas actualizado",
          ),
        };
      });

      await app.open();
      await app.goToSection("Admin");
      await page.getByRole("tab", { name: /Precios/ }).click();

      const input = page.getByLabel("Nuevo precio de Pack Hincha");
      await expect(input).toHaveValue("1500");
      await input.fill("2500");
      await page.getByRole("button", { name: "Guardar precio de Pack Hincha" }).click();

      await expect(page.getByText("Precio del pack de monedas actualizado")).toBeVisible();

      const request = await api.waitFor("PATCH", "/pricing/coin-packs/pack-1", { includePast: true });
      // Solo el precio: cualquier otro campo haría fallar el ValidationPipe del backend.
      expect(request.body).toEqual({ priceARS: 2500 });

      // La fila queda con el precio nuevo y sin nada pendiente de guardar.
      const row = page.getByRole("table", { name: "Packs de ChiquiCoins" }).getByRole("row").last();
      await expect(row).toContainText("$2.500");
      await expect(page.getByRole("button", { name: "Guardar precio de Pack Hincha" })).toBeDisabled();
    },
  );

  test("el presidente cambia el precio en monedas de una recompensa", async ({ app, page, api, session }) => {
    const item = buildPricingStoreItem({ id: "item-1", name: "Banner Bombonera", price: 2000 });
    asPresident(session, api, buildPricingOverview({ storeItems: [item] }));
    api.on("PATCH", "/pricing/store-items/:id", envelope(
      { storeItem: { ...item, price: 2800 }, change: buildPriceChangeLogEntry({ entity: "STORE_ITEM", currency: "COINS" }) },
      "Precio del ítem de la tienda actualizado",
    ));

    await app.open();
    await app.goToSection("Admin");
    await page.getByRole("tab", { name: /Precios/ }).click();

    await page.getByLabel("Nuevo precio de Banner Bombonera").fill("2800");
    await page.getByRole("button", { name: "Guardar precio de Banner Bombonera" }).click();

    await expect(page.getByText("Precio del ítem de la tienda actualizado")).toBeVisible();

    const request = await api.waitFor("PATCH", "/pricing/store-items/item-1", { includePast: true });
    expect(request.body).toEqual({ price: 2800 });
  });

  test("el presidente cambia el precio base de un plan", async ({ app, page, api, session }) => {
    const plan = buildPricingPlan({ id: "plan-1", name: "Plateísta", basePriceARS: 4000 });
    asPresident(session, api, buildPricingOverview({ subscriptionPlans: [plan] }));
    api.on("PATCH", "/pricing/subscription-plans/:id", envelope(
      { subscriptionPlan: { ...plan, basePriceARS: 5000 }, change: buildPriceChangeLogEntry({ entity: "SUBSCRIPTION_PLAN" }) },
      "Precio base del plan actualizado",
    ));

    await app.open();
    await app.goToSection("Admin");
    await page.getByRole("tab", { name: /Precios/ }).click();

    await page.getByLabel("Nuevo precio de Plateísta").fill("5000");
    await page.getByRole("button", { name: "Guardar precio de Plateísta" }).click();

    await expect(page.getByText("Precio base del plan actualizado")).toBeVisible();

    const request = await api.waitFor("PATCH", "/pricing/subscription-plans/plan-1", { includePast: true });
    expect(request.body).toEqual({ basePriceARS: 5000 });
  });

  test("si otro cambio se aplicó primero, el panel pide recargar", async ({ app, page, api, session }) => {
    const pack = buildPricingCoinPack({ id: "pack-1", name: "Pack Hincha", priceARS: 1500 });
    asPresident(session, api, buildPricingOverview({ coinPacks: [pack] }));
    api.on(
      "PATCH",
      "/pricing/coin-packs/:id",
      { message: "Otro cambio de precio se aplicó primero. Recargá el panel y volvé a intentar." },
      { status: 409 },
    );

    await app.open();
    await app.goToSection("Admin");
    await page.getByRole("tab", { name: /Precios/ }).click();

    await page.getByLabel("Nuevo precio de Pack Hincha").fill("2500");
    await page.getByRole("button", { name: "Guardar precio de Pack Hincha" }).click();

    await expect(page.getByText(/Recargá el panel/)).toBeVisible();
  });

  test("el botón de guardar queda deshabilitado mientras la request está en vuelo", async ({ app, page, api, session }) => {
    const pack = buildPricingCoinPack({ id: "pack-1", name: "Pack Hincha", priceARS: 1500 });
    asPresident(session, api, buildPricingOverview({ coinPacks: [pack] }));

    let release: () => void = () => {};
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });

    api.handle("PATCH", "/pricing/coin-packs/:id", async () => {
      try {
        await pending;
        return { status: 200, body: envelope({ coinPack: pack, change: null }, "Precio del pack de monedas actualizado") };
      } finally {
        release();
      }
    });

    await app.open();
    await app.goToSection("Admin");
    await page.getByRole("tab", { name: /Precios/ }).click();

    await page.getByLabel("Nuevo precio de Pack Hincha").fill("2500");
    const save = page.getByRole("button", { name: "Guardar precio de Pack Hincha" });
    await save.click();

    await expect(save).toBeDisabled();
    release();
    await expect(page.getByText("Precio del pack de monedas actualizado")).toBeVisible();
  });

  test("un ítem con descuento vigente avisa el precio efectivo", async ({ app, page, api, session }) => {
    const item = buildPricingStoreItem({ id: "item-1", name: "Banner Bombonera", price: 2000 });
    asPresident(session, api,
      buildPricingOverview({
        storeItems: [item],
        activeDiscounts: [buildPricingDiscount({ percentage: 25, scope: "ALL" })],
      }),
    );

    await app.open();
    await app.goToSection("Admin");
    await page.getByRole("tab", { name: /Precios/ }).click();

    await expect(
      page.getByText(/Descuento de tienda vigente −25%: queda en 1\.500 monedas como máximo/),
    ).toBeVisible();
  });

  test("un plan sin precio queda marcado como roto para Mercado Pago", async ({ app, page, api, session }) => {
    asPresident(session, api,
      buildPricingOverview({
        subscriptionPlans: [buildPricingPlan({ id: "plan-1", name: "Popular", basePriceARS: 0 })],
      }),
    );

    await app.open();
    await app.goToSection("Admin");
    await page.getByRole("tab", { name: /Precios/ }).click();

    await expect(page.getByText(/Mercado Pago rechaza el checkout/)).toBeVisible();
  });

  test("el historial muestra los últimos cambios de precio", async ({ app, page, api, session }) => {
    asPresident(session, api,
      buildPricingOverview({
        recentChanges: [
          buildPriceChangeLogEntry({
            entityName: "Pack Hincha",
            oldPrice: 1500,
            newPrice: 2500,
            changedByUsername: "elpresidente",
          }),
        ],
      }),
    );

    await app.open();
    await app.goToSection("Admin");
    await page.getByRole("tab", { name: /Precios/ }).click();

    const history = page.getByRole("table", { name: "Historial de cambios de precio" });
    await expect(history).toContainText("Pack Hincha");
    await expect(history).toContainText("$1.500");
    await expect(history).toContainText("$2.500");
    await expect(history).toContainText("@elpresidente");
  });

  test("el panel no pide los precios si el usuario no es presidente", async ({ app, page, api, session }) => {
    session.loginAs("ADMIN");
    mockAdminPanel(api);

    await app.open();
    await app.goToSection("Admin");

    await expect(page.getByRole("tab", { name: /Precios/ })).toBeDisabled();
    expect(api.requests("GET", "/pricing/admin")).toHaveLength(0);
  });
});
