import { expect, test } from "../../../fixtures/test";
import { buildCoinPack, buildPlan, buildStoreItem } from "../../../factories/store";
import { SubscriptionTier } from "@/features/subscriptions/types";
import { StorePage } from "../../../pages/store-page";

/**
 * El catálogo es público (los GET del backend son @OptionalAuth), pero comprar pide sesión.
 * Sin sesión se abre el login y no sale ninguna request de compra.
 */
test.describe("Tienda sin sesión", () => {
  const login = (page: import("@playwright/test").Page) =>
    page.getByRole("dialog", { name: "Iniciá sesión" });

  test("un visitante ve el catálogo de las tres pestañas", { tag: "@p0" }, async ({ app, page, api }) => {
    api.on("GET", "/coin-shop/packs", [buildCoinPack({ name: "Pack Barra" })]);
    api.on("GET", "/store", [buildStoreItem({ name: "Banner Bombonera" })]);
    api.on("GET", "/subscriptions/plans", [buildPlan(SubscriptionTier.TIER_1, { name: "Platea" })]);
    const store = new StorePage(page);

    await app.open();
    await app.goToSection("Tienda");

    await store.openTab("packs");
    await expect(store.card("Pack Barra")).toBeVisible();
    await store.openTab("cosmeticos");
    await expect(store.card("Banner Bombonera")).toBeVisible();
    await store.openTab("suscripciones");
    await expect(store.card("Platea")).toBeVisible();
  });

  test("comprar un pack de monedas pide la sesión y no llama al backend", { tag: "@p0" }, async ({ app, page, api }) => {
    const pack = buildCoinPack({ name: "Pack Barra" });
    api.on("GET", "/coin-shop/packs", [pack]);
    const store = new StorePage(page);

    await app.open();
    await app.goToSection("Tienda");
    await store.openTab("packs");
    await store.card("Pack Barra").getByRole("button", { name: "Comprar" }).click();

    await expect(login(page)).toContainText("Entrá para comprar en la tienda.");
    expect(api.requests("POST", "/coin-shop/buy")).toHaveLength(0);
  });

  test("comprar un cosmético pide la sesión y no abre el modal de compra", { tag: "@p0" }, async ({ app, page, api }) => {
    api.on("GET", "/store", [buildStoreItem({ name: "Banner Bombonera", price: 500 })]);
    const store = new StorePage(page);

    await app.open();
    await app.goToSection("Tienda");
    await store.openTab("cosmeticos");
    await store.card("Banner Bombonera").getByRole("button", { name: "Comprar" }).click();

    await expect(login(page)).toBeVisible();
    await expect(store.purchaseDialog).toBeHidden();
    expect(api.requests("POST", "/store/buy/:itemId")).toHaveLength(0);
  });

  test("suscribirse pide la sesión y no llama al checkout", { tag: "@p0" }, async ({ app, page, api }) => {
    api.on("GET", "/subscriptions/plans", [buildPlan(SubscriptionTier.TIER_1, { name: "Platea" })]);
    const store = new StorePage(page);

    await app.open();
    await app.goToSection("Tienda");
    await store.openTab("suscripciones");
    await store.card("Platea").getByRole("button", { name: "SUSCRIBIRSE" }).click();

    await expect(login(page)).toContainText("Entrá para comprar en la tienda.");
    expect(api.requests("POST", "/subscriptions/checkout")).toHaveLength(0);
  });
});
