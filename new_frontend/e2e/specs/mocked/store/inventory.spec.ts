import type { InventoryItem } from "@/features/inventory/types";
import { expect, test } from "../../../fixtures/test";
import { buildInventoryItem } from "../../../factories/store";

test.describe("Inventario en Mi Perfil", () => {
  test.beforeEach(async ({ session }) => {
    session.loginAs("USER");
  });

  test("equipar y desequipar un banner", { tag: ["@p0", "@mobile"] }, async ({ app, page, api }) => {
    let banner = buildInventoryItem({ item: { name: "Banner Bombonera", type: "BANNER", assetId: "bombonera" } });
    api.on("GET", "/inventory", () => [banner]);
    api.handle("POST", "/inventory/equip/:itemId", () => {
      banner = { ...banner, isEquipped: true };
      return { body: { status: "ok", equipped: "BANNER", assetId: "bombonera" } };
    });
    api.handle("POST", "/inventory/unequip/:type", () => {
      banner = { ...banner, isEquipped: false };
      return { body: { status: "ok", unequipped: "BANNER" } };
    });

    await app.open();
    await app.goToSection("Mi Perfil");
    const card = page.getByRole("article", { name: "Banner Bombonera" });
    await card.getByRole("button", { name: "Equipar" }).click();

    await expect(card.getByRole("button", { name: "Desequipar" })).toBeVisible();
    expect(api.lastRequest("POST", "/inventory/equip/:itemId")?.path).toBe(`/inventory/equip/${banner.itemId}`);

    await card.getByRole("button", { name: "Desequipar" }).click();

    await expect(card.getByRole("button", { name: "Equipar" })).toBeVisible();
    expect(api.lastRequest("POST", "/inventory/unequip/:type")?.path).toBe("/inventory/unequip/BANNER");
  });

  test("los consumibles y stickers no se equipan", async ({ app, page, api }) => {
    const items: InventoryItem[] = [
      buildInventoryItem({ quantity: 3, item: { name: "Megáfono", type: "MEGAPHONE", assetId: "megaphone" } }),
      buildInventoryItem({ item: { name: "Pack Hinchada", type: "STICKER_PACK", assetId: "hinchada" } }),
    ];
    api.on("GET", "/inventory", items);

    await app.open();
    await app.goToSection("Mi Perfil");

    const megaphone = page.getByRole("article", { name: "Megáfono" });
    await expect(megaphone).toContainText("x3");
    await expect(megaphone).toContainText("Se usa automáticamente");
    await expect(page.getByRole("article", { name: "Pack Hinchada" })).toContainText("Disponible en el chat");
    await expect(page.getByRole("button", { name: "Equipar" })).toHaveCount(0);
  });

  test("filtrar por tipo muestra solo esa categoría", async ({ app, page, api }) => {
    api.on("GET", "/inventory", [
      buildInventoryItem({ item: { name: "Banner Bombonera", type: "BANNER" } }),
      buildInventoryItem({ item: { name: "Color Xeneize", type: "NAME_COLOR", assetId: "boca" } }),
    ]);

    await app.open();
    await app.goToSection("Mi Perfil");
    await page.getByRole("button", { name: /Color Mensaje/ }).click();

    await expect(page.getByRole("article", { name: "Color Xeneize" })).toBeVisible();
    await expect(page.getByRole("article", { name: "Banner Bombonera" })).toBeHidden();

    await page.getByRole("button", { name: /Burbujas/ }).click();
    await expect(page.getByText("No tenés ítems de esta categoría.")).toBeVisible();
  });
});
