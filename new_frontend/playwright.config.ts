import { defineConfig, devices } from "@playwright/test";
import { BASE_URL, FULLSTACK_BASE_URL } from "./e2e/support/env";

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e/specs",
  outputDir: "./test-results",
  globalSetup: "./e2e/global-setup.ts",
  // En local `next dev` compila cada ruta en la primera visita.
  timeout: isCI ? 30_000 : 60_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    locale: "es-AR",
    timezoneId: "America/Argentina/Buenos_Aires",
    reducedMotion: "reduce",
    serviceWorkers: "block",
    // Grabar video o trace en cada test multiplica el tiempo de carga (~25 MB de JS en dev):
    // solo en reintentos. Para depurar en local: `npx playwright test --trace on`.
    trace: "on-first-retry",
    video: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "mocked-desktop",
      testDir: "./e2e/specs/mocked",
      // @mobile-only: barra inferior y menú hamburguesa, que no existen en escritorio.
      grepInvert: /@mobile-only/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // El layout móvil es distinto (header recortado, MobileNav): corre solo lo marcado
      // @mobile (los que valen para las dos resoluciones) o @mobile-only.
      name: "mocked-mobile",
      testDir: "./e2e/specs/mocked",
      grep: /@mobile/,
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "fullstack-setup",
      testDir: "./e2e/specs/fullstack",
      testMatch: /.*\.setup\.ts/,
    },
    {
      // El backend guarda un solo refresh token válido por usuario: los tests full-stack van en serie.
      name: "fullstack",
      testDir: "./e2e/specs/fullstack",
      dependencies: ["fullstack-setup"],
      fullyParallel: false,
      workers: 1,
      timeout: 120_000,
      // El front de Docker es `next dev` con polling: a veces aborta una navegación mientras compila.
      retries: 1,
      use: { ...devices["Desktop Chrome"], baseURL: FULLSTACK_BASE_URL },
    },
  ],
  // En local conviene dejar `npm run dev:e2e` corriendo en otra terminal: se reutiliza y
  // no se recompila en cada corrida. En CI se sirve el build de producción.
  webServer: {
    command: isCI ? "npm run start:e2e" : "npm run dev:e2e",
    // Un archivo estático: si `/` da un 500 transitorio mientras compila, Playwright no intenta levantar otro servidor.
    url: `${BASE_URL}/logo/chiqui-mafias-logo.png`,
    reuseExistingServer: !isCI,
    timeout: 300_000,
  },
});
