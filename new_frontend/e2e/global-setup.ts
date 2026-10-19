import { BASE_URL } from "./support/env";

// En `next dev` cada ruta se compila en su primera visita, y las requests concurrentes que llegan
// mientras tanto pueden leer manifests a medio escribir ("Unexpected end of JSON input").
// Compilarlas antes de arrancar evita esos fallos espurios. Con `next start` no hace nada útil, pero tampoco molesta.
const ROUTES = ["/", "/shop", "/match/e2e-warmup", "/e2e-ruta-inexistente"];

export default async function globalSetup() {
  for (const route of ROUTES) {
    await fetch(`${BASE_URL}${route}`, { redirect: "manual" }).catch(() => undefined);
  }
}
