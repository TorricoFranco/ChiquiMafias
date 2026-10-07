import { expect, type Locator, type Page } from "@playwright/test";

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Sección Pronósticos: tarjetas de mercados y ticket de apuestas. */
export class BetsPage {
  readonly ticket: Locator;
  readonly confirmButton: Locator;
  /** Barra "TICKET (n)" de móvil que abre la hoja del ticket. No existe en escritorio. */
  readonly mobileTicketToggle: Locator;

  constructor(readonly page: Page) {
    this.ticket = page.getByRole("complementary", { name: "Mi ticket" });
    this.confirmButton = this.ticket.getByRole("button", { name: /^Confirmar/ });
    this.mobileTicketToggle = page.getByRole("button", { name: /^TICKET \(\d+\)/ });
  }

  /** En móvil el ticket queda colapsado abajo: lo abre. En escritorio ya está a la vista. */
  async showTicket() {
    if ((this.page.viewportSize()?.width ?? 1024) >= 1024) return;
    await this.mobileTicketToggle.click();
    await expect(this.mobileTicketToggle).toHaveAttribute("aria-expanded", "true");
  }

  market(title: string) {
    return this.page.getByRole("main").getByRole("article", { name: title });
  }

  /** Botón de cuota: su nombre accesible es "<opción> <cuota>". */
  option(marketTitle: string, optionName: string) {
    return this.market(marketTitle).getByRole("button", { name: new RegExp(`^${escapeRegExp(optionName)} `) });
  }

  amountFor(selection: string) {
    return this.ticket.getByLabel(`Monto a apostar en ${selection}`);
  }

  filter(label: RegExp) {
    return this.page.getByRole("main").getByRole("button", { name: label });
  }
}
