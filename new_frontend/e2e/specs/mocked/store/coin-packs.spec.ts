import { expect, test } from "../../../fixtures/test";
import { buildBuyPackResponse, buildCoinPack } from "../../../factories/store";
import { StorePage } from "../../../pages/store-page";
import { BASE_URL } from "../../../support/env";
import { MERCADO_PAGO_MOCK_TITLE, MP_CHECKOUT_URL } from "../../../support/third-party";

test.describe("Packs de Chiqui-Coins (Mercado Pago)", () => {
  test.beforeEach(async ({ session }) => {
    session.loginAs("USER", {}, { balance: 1000 });
  });

  test("comprar un pack lleva al checkout de Mercado Pago", { tag: ["@p0", "@mobile"] }, async ({ app, page, api }) => {
    const barra = buildCoinPack({ name: "Pack Barra", coinsAmount: 5000, bonusCoins: 500, isPopular: true, priceARS: 6000 });
    api.on("GET", "/coin-shop/packs", [buildCoinPack(), barra]);
    api.on("POST", "/coin-shop/buy", buildBuyPackResponse());
    const store = new StorePage(page);

    await app.open();
    await app.goToSection("Tienda");
    await store.openTab("packs");
    await expect(store.card("Pack Barra")).toContainText("¡+500 GRATIS!");
    await store.card("Pack Barra").getByRole("button", { name: "Comprar" }).click();

    await expect(page).toHaveURL(MP_CHECKOUT_URL);
    await expect(page).toHaveTitle(MERCADO_PAGO_MOCK_TITLE);
    expect(api.lastRequest("POST", "/coin-shop/buy")?.body).toEqual({ packId: barra.id });
  });

  test("si no se puede iniciar el pago avisa y no sale de la tienda", { tag: "@p0" }, async ({ app, page, api }) => {
    const pack = buildCoinPack();
    api.on("GET", "/coin-shop/packs", [pack]);
    api.on("POST", "/coin-shop/buy", { statusCode: 502, message: "Mercado Pago no respondió" }, { status: 502 });
    const store = new StorePage(page);

    await app.open();
    await app.goToSection("Tienda");
    await store.openTab("packs");
    await store.card(pack.name).getByRole("button", { name: "Comprar" }).click();

    await expect(page.getByText("Mercado Pago no respondió")).toBeVisible();
    await expect(page).toHaveURL(`${BASE_URL}/`);
  });

  test("los packs inactivos no se ofrecen", async ({ app, page, api }) => {
    api.on("GET", "/coin-shop/packs", [buildCoinPack({ name: "Pack Activo" }), buildCoinPack({ name: "Pack Viejo", isActive: false })]);
    const store = new StorePage(page);

    await app.open();
    await app.goToSection("Tienda");
    await store.openTab("packs");

    await expect(store.card("Pack Activo")).toBeVisible();
    await expect(store.card("Pack Viejo")).toBeHidden();
  });

  test("al volver de un pago aprobado muestra el saldo acreditado", { tag: "@p0" }, async ({ page, session, app }) => {
    session.balance = 6000;
    await page.addInitScript(() => localStorage.setItem("prePurchaseBalance", "1000"));

    await page.goto("/shop?status=success&orderId=order-123");

    await expect(page).toHaveURL(`${BASE_URL}/?status=success&orderId=order-123`);
    await expect(app.balance).toContainText("6.000");
    expect(await page.evaluate(() => localStorage.getItem("prePurchaseBalance"))).toBeNull();
  });
});
