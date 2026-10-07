import type { BrowserContext } from "@playwright/test";

/**
 * En `next dev` flotan el indicador de Next y el botón de las devtools de React Query,
 * que tapan toasts y botones de las esquinas. Los errores de runtime igual los captura
 * el fixture `pageErrors`.
 */
export async function hideDevOverlays(context: BrowserContext) {
  await context.addInitScript(() => {
    const style = document.createElement("style");
    style.textContent = "nextjs-portal, .tsqd-parent-container { display: none !important; }";
    document.addEventListener("DOMContentLoaded", () => document.head.appendChild(style));
  });
}
import { API_URL, BASE_URL } from "./env";

const DEFAULT_FIRST_PARTY = [BASE_URL, API_URL];

export const MERCADO_PAGO_MOCK_TITLE = "Mercado Pago (mock e2e)";
export const MP_CHECKOUT_URL = "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=e2e-preference";
export const GOOGLE_BUTTON_NAME = "Continuar con Google";

// Reemplazo de Google Identity Services: el botón real es un iframe de Google que no se puede
// automatizar. Este dibuja un botón que entrega una credencial fija al callback de la app.
const FAKE_GSI = `
window.google = {
  accounts: {
    id: {
      initialize(config) { window.__e2eGsiCallback = config.callback; },
      renderButton(element) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = ${JSON.stringify(GOOGLE_BUTTON_NAME)};
        button.addEventListener("click", () => window.__e2eGsiCallback({ credential: "e2e-google-credential" }));
        element.replaceChildren(button);
      },
      prompt() {},
      cancel() {},
      disableAutoSelect() {},
    },
  },
};`;

/**
 * Ningún test sale a internet: Google Identity Services se reemplaza por un GSI falso,
 * las fuentes por CSS vacío, Mercado Pago por una página fija y el resto se aborta.
 * `firstPartyUrls`: el front y la API que sí se dejan pasar (el smoke full-stack usa otro puerto).
 */
export async function blockThirdParty(context: BrowserContext, firstPartyUrls: string[] = DEFAULT_FIRST_PARTY) {
  const firstPartyHosts = new Set(firstPartyUrls.map((url) => new URL(url).host));
  await context.route(
    (url) => url.protocol.startsWith("http") && !firstPartyHosts.has(url.host),
    async (route) => {
      const { hostname } = new URL(route.request().url());

      if (hostname === "accounts.google.com") {
        await route.fulfill({ contentType: "application/javascript", body: FAKE_GSI });
      } else if (hostname === "fonts.googleapis.com") {
        await route.fulfill({ contentType: "text/css", body: "" });
      } else if (/(^|\.)mercadopago\.|(^|\.)mercadolibre\./.test(hostname)) {
        await route.fulfill({
          contentType: "text/html",
          body: `<!doctype html><html><head><title>${MERCADO_PAGO_MOCK_TITLE}</title></head><body><h1>${MERCADO_PAGO_MOCK_TITLE}</h1></body></html>`,
        });
      } else {
        await route.abort("blockedbyclient");
      }
    },
  );
}
