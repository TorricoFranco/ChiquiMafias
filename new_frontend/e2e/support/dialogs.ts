import type { Page } from "@playwright/test";

/**
 * Acepta el próximo alert/confirm y devuelve su texto. Hay que llamarlo ANTES de la acción
 * que lo abre: aceptar dentro del handler evita que el diálogo quede colgado si aparece
 * mientras Playwright todavía está terminando el click.
 */
export function acceptNextDialog(page: Page): Promise<string> {
  return new Promise((resolve) => {
    page.once("dialog", async (dialog) => {
      resolve(dialog.message());
      await dialog.accept();
    });
  });
}
