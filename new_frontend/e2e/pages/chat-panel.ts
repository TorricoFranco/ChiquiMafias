import type { Locator, Page } from "@playwright/test";

/** Chat de la tribuna (global en la home, o el del partido). */
export class ChatPanel {
  readonly log: Locator;
  readonly input: Locator;
  readonly sendButton: Locator;

  constructor(readonly page: Page) {
    this.log = page.getByRole("log", { name: "Mensajes del chat" });
    this.input = page.getByRole("textbox", { name: "Mensaje para el chat" });
    this.sendButton = page.getByRole("button", { name: "Enviar mensaje" });
  }

  message(author: string) {
    return this.log.getByRole("article", { name: `Mensaje de ${author}` });
  }

  async openMessageMenu(author: string) {
    await this.message(author).getByRole("button", { name: `Opciones del mensaje de ${author}` }).click();
  }

  async send(text: string) {
    await this.input.fill(text);
    await this.input.press("Enter");
  }
}
