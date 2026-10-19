import { test as base, expect, type APIRequestContext, type Page } from "@playwright/test";
import { AppShell } from "../pages/app-shell";
import { API_URL, FULLSTACK_BASE_URL } from "../support/env";
import { blockThirdParty, hideDevOverlays } from "../support/third-party";

/** Usuarios que crea `npm run seed:e2e` en el backend (`<slug>@chiquimafias.test`). */
export type E2eUser = "e2e-user" | "e2e-user2" | "e2e-mod" | "e2e-admin" | "e2e-president";

export const e2eEmail = (user: E2eUser) => `${user}@chiquimafias.test`;
export const e2eUsername = (user: E2eUser) => user.replace(/-/g, "_");

export interface DevLogin {
  accessToken: string;
  user: { id: string; username: string; role: string };
}

/**
 * Login real por `POST /auth/dev-login` (requiere ENABLE_DEV_TOOLS=true en el backend).
 * Con `page.request`, la cookie `refresh_token` queda en el contexto del navegador y la app
 * restaura la sesión sola al cargar. Cada login rota el refresh token: nunca se comparte un
 * storageState entre tests.
 */
export async function devLogin(request: APIRequestContext, user: E2eUser): Promise<DevLogin> {
  const response = await request.post(`${API_URL}/auth/dev-login`, { data: { email: e2eEmail(user) } });
  expect(
    response.ok(),
    `dev-login de ${user} respondió ${response.status()}: activá ENABLE_DEV_TOOLS=true en .env.dev y corré seed:e2e`,
  ).toBeTruthy();
  const body = (await response.json()) as { access_token: string; user: DevLogin["user"] };
  return { accessToken: body.access_token, user: body.user };
}

interface FullstackFixtures {
  app: AppShell;
  /** Inicia sesión en el navegador del test con un usuario del seed. */
  loginAs: (user: E2eUser) => Promise<DevLogin>;
  /** Abre otra pestaña aislada (otro navegador) ya logueada, para probar tiempo real. */
  openSecondSession: (user: E2eUser) => Promise<{ page: Page; app: AppShell }>;
}

/** Smoke contra el stack real (Docker): sin mocks, salvo los servicios de terceros. */
export const test = base.extend<FullstackFixtures>({
  context: async ({ context }, use) => {
    await blockThirdParty(context, [FULLSTACK_BASE_URL, API_URL]);
    await hideDevOverlays(context);
    await use(context);
  },

  app: async ({ page }, use) => {
    await use(new AppShell(page));
  },

  loginAs: async ({ page }, use) => {
    await use((user) => devLogin(page.request, user));
  },

  openSecondSession: async ({ browser }, use) => {
    const contexts: Awaited<ReturnType<typeof browser.newContext>>[] = [];
    await use(async (user) => {
      const context = await browser.newContext({ baseURL: FULLSTACK_BASE_URL });
      contexts.push(context);
      await blockThirdParty(context, [FULLSTACK_BASE_URL, API_URL]);
      await hideDevOverlays(context);
      const page = await context.newPage();
      await devLogin(page.request, user);
      return { page, app: new AppShell(page) };
    });
    await Promise.all(contexts.map((context) => context.close()));
  },
});

/** Llamadas directas a la API como un usuario (admin que crea o liquida mercados, etc.). */
export async function apiAs(request: APIRequestContext, token: string) {
  const headers = { Authorization: `Bearer ${token}` };
  return {
    get: (path: string) => request.get(`${API_URL}${path}`, { headers }),
    post: (path: string, data?: unknown) => request.post(`${API_URL}${path}`, { headers, data }),
  };
}

export { expect };
