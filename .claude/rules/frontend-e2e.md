---
paths:
  - "new_frontend/e2e/**"
  - "new_frontend/playwright.config.ts"
---

# Tests E2E de new_frontend (Playwright)

## Estructura

- `e2e/fixtures/test.ts`: importá `test` y `expect` **siempre** desde acá, no de `@playwright/test`. Trae estas fixtures:
  - `api`: mock HTTP estricto.
  - `session`: sesión mockeada.
  - `socket`: Socket.IO falso.
  - `app`: page object del shell.
  - `pageErrors`: hace fallar el test ante errores de JS.
- `e2e/support/`:
  - `api-mock.ts`: `api.on(method, path, body)`, `api.handle(...)` para respuestas dinámicas, y `api.lastRequest`, `api.requests` y `api.waitFor` para asserts.
  - `session.ts`: `loginAs(role, overrides, { balance })`, `loginAsBanned`, `expireAccessToken`, `banAfterRefresh`, `rotateRefreshWithoutGrace` (refresh que rota como el backend, para tests con varias pestañas).
  - `socket-io-mock.ts`: `emit`, `onEmit` (acks), `onConnect`, `waitForEmit`, `waitForConnection`, `disconnectAll` (el backend corta el socket).
  - `defaults.ts`: respuestas vacías de lo que pide el layout en cada carga.
  - `public-routes.ts`: copia de las rutas `@Public` y `@AllowBannedForAppeal` del backend. Si el backend cambia un guard, actualizala.
- `e2e/factories/`: `build<X>(overrides)` tipados con `@/features/<dominio>/types`. Nunca armes respuestas a mano en el spec.
- `e2e/pages/`: page objects solo para lo que se repite (`AppShell`, `BetsPage`, `StorePage`, `ChatPanel`). `app.goToSection()` funciona en escritorio y en móvil.
- `e2e/specs/mocked/<dominio>/*.spec.ts` y `e2e/specs/fullstack/`.

## Reglas

- **Locators:** `getByRole` > `getByLabel` > `getByPlaceholder` > `getByText` > `getByTestId`. Nunca clases de Tailwind, XPath ni `nth()` sobre estructura. Si un elemento no tiene nombre accesible, agregá `aria-label`, `role` o `htmlFor` en el componente, sin cambios visuales.
- **Esperas:** solo web-first assertions (`await expect(loc).toBeVisible()`, `toHaveURL`, `toHaveAttribute`). Nunca `waitForTimeout` ni `networkidle`: la app hace polling.
- **Aislamiento:** cada test arma sus mocks con factories y no depende de otro. Registrá los mocks antes de `app.open()`.
- **Endpoint nuevo:** si un componente empieza a pedir un endpoint en cada carga, agregalo a `defaults.ts`. Si no, mockealo en el spec que lo usa. No desactives el modo estricto.
- **Auth:** el mock replica `JwtAuthGuard` y `UserStatusGuard`. Una ruta privada sin sesión devuelve 401 y un usuario baneado recibe 403 `USER_BANNED`. No lo saltees en un handler.
- **Tiempo:** `page.clock` para cuentas regresivas y fechas. Los tests corren con `timezoneId: America/Argentina/Buenos_Aires` y `locale: es-AR`.
- **Diálogos nativos:** `acceptNextDialog(page)` (de `support/dialogs.ts`) **antes** del click que los abre.
- **Móvil:** `@mobile` = el test vale en las dos resoluciones. `@mobile-only` = barra inferior y menú hamburguesa (no corre en escritorio). Sin tag corre solo en escritorio.
- **Nombres:** `describe` y `test` en español, describiendo lo que hace el usuario. `@p0` para los flujos de sesión y dinero.
- Un bug encontrado por un test se arregla en la app con su `fix(...)` separado. No se adapta el test al bug.

## Correr

- Desde `new_frontend/`: `npx playwright test --project=mocked-desktop --project=mocked-mobile` (o `npm run test:e2e`). Reutiliza `npm run dev:e2e` si está corriendo en :3100.
- **No** uses `npm run test:e2e` desde `backend/`: ahí son los e2e que borran la DB.
- Antes de dar por terminado un cambio en `e2e/`: `npm run typecheck:e2e`, `npx eslint e2e playwright.config.ts` y los specs tocados con `--repeat-each=3`.
