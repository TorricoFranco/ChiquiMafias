import { test as setup, expect, type APIRequestContext } from "@playwright/test";
import { apiAs, devLogin, type E2eUser } from "../../fixtures/fullstack";
import { API_URL, FULLSTACK_BASE_URL } from "../../support/env";

const MIN_BALANCE = 5_000;
/** Usuarios que los specs usan en el navegador. */
const UI_USERS: E2eUser[] = ["e2e-user", "e2e-user2", "e2e-admin"];
/** Los que apuestan o compran: necesitan saldo. */
const PLAYERS: E2eUser[] = ["e2e-user", "e2e-user2"];

/**
 * Hace el check-in del día y reclama el premio si corresponde, como un usuario real.
 * Sin esto, el primer login del día abre el modal "Racha diaria" y tapa la pantalla.
 */
async function claimDailyStreak(request: APIRequestContext, user: E2eUser) {
  const { accessToken } = await devLogin(request, user);
  const api = await apiAs(request, accessToken);
  const checkIn = await api.post("/subscriptions/streak/check-in");
  expect(checkIn.ok(), `check-in de ${user} respondió ${checkIn.status()}`).toBeTruthy();
  const { canClaimReward } = (await checkIn.json()) as { canClaimReward: boolean };
  if (!canClaimReward) return;

  const claim = await api.post("/subscriptions/streak/claim");
  expect(claim.ok(), `reclamar la racha de ${user} respondió ${claim.status()}`).toBeTruthy();
}

/** Carga lo que falte hasta MIN_BALANCE con add-coins (como PRESIDENT), el camino real de producción. */
async function ensureBalance(request: APIRequestContext, presidentToken: string, player: E2eUser) {
  const { accessToken, user } = await devLogin(request, player);
  const balanceResponse = await (await apiAs(request, accessToken)).post("/wallet/my-balance");
  expect(balanceResponse.ok(), `no se pudo leer el saldo de ${player}`).toBeTruthy();
  const missing = MIN_BALANCE - Number(await balanceResponse.text());
  if (missing <= 0) return;

  const topUp = await (await apiAs(request, presidentToken)).post("/wallet/admin/add-coins", {
    userId: user.id,
    amount: missing,
    description: "[E2E] Carga para el smoke full-stack",
  });
  expect(topUp.ok(), `add-coins para ${player} respondió ${topUp.status()}`).toBeTruthy();
}

setup("el stack responde y los usuarios del seed están listos", async ({ playwright }) => {
  // La primera compilación del front de Docker (next dev con polling) puede tardar minutos.
  setup.setTimeout(300_000);
  const request = await playwright.request.newContext();
  try {
    const health = await request.get(`${API_URL}/fixtures/live-scores`).catch(() => null);
    expect(
      health?.ok(),
      `El backend no responde en ${API_URL}. Levantá el stack: docker compose -f docker-compose.dev.yml up`,
    ).toBeTruthy();

    for (const user of UI_USERS) {
      await claimDailyStreak(request, user);
    }

    const president = await devLogin(request, "e2e-president");
    for (const player of PLAYERS) {
      await ensureBalance(request, president.accessToken, player);
    }

    // El front de Docker es `next dev`: compila cada ruta en la primera visita. Mejor acá que en un test.
    const home = await request.get(FULLSTACK_BASE_URL, { timeout: 180_000 });
    expect(home.ok(), `el front no responde en ${FULLSTACK_BASE_URL}`).toBeTruthy();
  } finally {
    await request.dispose();
  }
});
