import { test as base, expect } from "@playwright/test";
import { ApiMock } from "../support/api-mock";
import { installDefaults } from "../support/defaults";
import { MockSession } from "../support/session";
import { SocketMock } from "../support/socket-io-mock";
import { blockThirdParty, hideDevOverlays } from "../support/third-party";
import { AppShell } from "../pages/app-shell";

interface MockedFixtures {
  session: MockSession;
  api: ApiMock;
  socket: SocketMock;
  app: AppShell;
  pageErrors: Error[];
}

/** Test con backend simulado: API estricta, Socket.IO falso y sin salir a internet. */
export const test = base.extend<MockedFixtures>({
  context: async ({ context }, use) => {
    await blockThirdParty(context);
    await hideDevOverlays(context);
    await use(context);
  },

  session: async ({}, use) => {
    await use(new MockSession());
  },

  api: [
    async ({ page, session }, use) => {
      const api = new ApiMock(page);
      await api.install();
      session.install(api);
      installDefaults(api, session);
      await use(api);
      api.assertNoUnhandled();
    },
    { auto: true },
  ],

  socket: [
    async ({ page }, use) => {
      const socket = new SocketMock(page);
      await socket.install();
      await use(socket);
    },
    { auto: true },
  ],

  pageErrors: [
    async ({ page }, use) => {
      const errors: Error[] = [];
      page.on("pageerror", (error) => errors.push(error));
      await use(errors);
      expect(errors.map((error) => error.message), "errores no capturados en la página").toEqual([]);
    },
    { auto: true },
  ],

  app: async ({ page }, use) => {
    await use(new AppShell(page));
  },
});

export { expect };
