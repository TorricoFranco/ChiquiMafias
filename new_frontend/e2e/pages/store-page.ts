import type { Locator, Page } from "@playwright/test";

const TABS = {
  suscripciones: /Suscripciones VIP/,
  packs: /Packs Chiqui-Coins/,
  cosmeticos: /Cosméticos & Consumibles/,
} as const;

/** Sección Tienda: suscripciones, packs de monedas (Mercado Pago) y cosméticos. */
export class StorePage {
  readonly purchaseDialog: Locator;

  constructor(readonly page: Page) {
    this.purchaseDialog = page.getByRole("dialog", { name: "Confirmar Compra" });
  }

  async openTab(tab: keyof typeof TABS) {
    await this.page.getByRole("tab", { name: TABS[tab] }).click();
  }

  card(name: string) {
    return this.page.getByRole("main").getByRole("article", { name });
  }
}
