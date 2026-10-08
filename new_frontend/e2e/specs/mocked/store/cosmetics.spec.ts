import { expect, test } from "../../../fixtures/test";
import { buildStoreItem } from "../../../factories/store";
import { StorePage } from "../../../pages/store-page";

test.describe("Cosméticos y consumibles", () => {
  test.beforeEach(async ({ session }) => {
    session.loginAs("USER", {}, { balance: 1000 });
  });

  test("comprar un cosmético pide confirmación y lo compra al aceptar", { tag: ["@p0", "@mobile"] }, async ({ app, page, api }) => {
    const banner = buildStoreItem({ name: "Banner Bombonera", price: 500 });
    api.on("GET", "/store", [banner]);
    api.on("POST", "/store/buy/:itemId", { status: "success", message: "Compra realizada", data: {} });
    const store = new StorePage(page);

    await app.open();
    await app.goToSection("Tienda");
    await store.openTab("cosmeticos");
    await store.card("Banner Bombonera").getByRole("button", { name: "Comprar" }).click();

    await expect(store.purchaseDialog).toContainText("1x Banner Bombonera");
    await expect(store.purchaseDialog).toContainText("500");
    await store.purchaseDialog.getByRole("button", { name: "Aceptar" }).click();

    await expect(store.purchaseDialog.getByText("¡Compra exitosa! Revisa tu inventario.")).toBeVisible();
    await expect(store.purchaseDialog).toBeHidden();
    const purchase = api.lastRequest("POST", "/store/buy/:itemId");
    expect(purchase?.path).toBe(`/store/buy/${banner.id}`);
    expect(purchase?.body).toEqual({ quantity: 1 });
  });

  test("los consumibles se compran por cantidad", { tag: "@p0" }, async ({ app, page, api }) => {
    const megaphone = buildStoreItem({ name: "Megáfono", type: "MEGAPHONE", price: 100, assetId: "megaphone" });
    api.on("GET", "/store", [megaphone]);
    api.on("POST", "/store/buy/:itemId", { status: "success", message: "Compra realizada", data: {} });
    const store = new StorePage(page);

    await app.open();
    await app.goToSection("Tienda");
    await store.openTab("cosmeticos");
    const card = store.card("Megáfono");
    await card.getByRole("button", { name: "Sumar una unidad" }).click();
    await card.getByRole("button", { name: "Sumar una unidad" }).click();
    await card.getByRole("button", { name: "Comprar" }).click();

    await expect(store.purchaseDialog).toContainText("3x Megáfono");
    await expect(store.purchaseDialog).toContainText("300");
    await store.purchaseDialog.getByRole("button", { name: "Aceptar" }).click();

    await expect(store.purchaseDialog).toBeHidden();
    expect(api.lastRequest("POST", "/store/buy/:itemId")?.body).toEqual({ quantity: 3 });
  });

  test("sin monedas suficientes no deja aceptar la compra", { tag: "@p0" }, async ({ app, page, api, session }) => {
    session.balance = 100;
    api.on("GET", "/store", [buildStoreItem({ name: "Banner Monumental", price: 500 })]);
    const store = new StorePage(page);

    await app.open();
    await app.goToSection("Tienda");
    await store.openTab("cosmeticos");
    await store.card("Banner Monumental").getByRole("button", { name: "Comprar" }).click();

    await expect(store.purchaseDialog.getByText("No tenés las monedas suficientes para esta compra.")).toBeVisible();
    await expect(store.purchaseDialog.getByRole("button", { name: "Aceptar" })).toBeDisabled();
    await store.purchaseDialog.getByRole("button", { name: "Cancelar" }).click();
    await expect(store.purchaseDialog).toBeHidden();
  });

  test("si el backend rechaza la compra muestra el motivo en el modal", async ({ app, page, api }) => {
    api.on("GET", "/store", [buildStoreItem({ name: "Burbuja Fuego", type: "CHAT_BUBBLE", assetId: "fireball" })]);
    api.on("POST", "/store/buy/:itemId", { statusCode: 409, message: "Ya tenés este artículo" }, { status: 409 });
    const store = new StorePage(page);

    await app.open();
    await app.goToSection("Tienda");
    await store.openTab("cosmeticos");
    await store.card("Burbuja Fuego").getByRole("button", { name: "Comprar" }).click();
    await store.purchaseDialog.getByRole("button", { name: "Aceptar" }).click();

    await expect(store.purchaseDialog.getByText("Ya tenés este artículo")).toBeVisible();
  });

  test("lo permanente que ya tenés figura como adquirido", async ({ app, page, api }) => {
    api.on("GET", "/store", [buildStoreItem({ name: "Color Xeneize", type: "NAME_COLOR", assetId: "boca", isOwned: true })]);
    const store = new StorePage(page);

    await app.open();
    await app.goToSection("Tienda");
    await store.openTab("cosmeticos");

    await expect(store.card("Color Xeneize").getByRole("button", { name: "Ya Adquirido" })).toBeDisabled();
  });

  test("el filtro de consumibles oculta lo permanente", async ({ app, page, api }) => {
    api.on("GET", "/store", [
      buildStoreItem({ name: "Banner Bombonera" }),
      buildStoreItem({ name: "Megáfono", type: "MEGAPHONE", price: 100, assetId: "megaphone" }),
    ]);
    const store = new StorePage(page);

    await app.open();
    await app.goToSection("Tienda");
    await store.openTab("cosmeticos");
    await page.getByRole("button", { name: "Consumibles", exact: true }).click();

    await expect(store.card("Megáfono")).toBeVisible();
    await expect(store.card("Banner Bombonera")).toBeHidden();
  });
});
