import { apiAs, devLogin, e2eUsername, expect, test } from "../../fixtures/fullstack";
import type { AppShell } from "../../pages/app-shell";
import { BetsPage } from "../../pages/bets-page";
import { ChatPanel } from "../../pages/chat-panel";
import { StorePage } from "../../pages/store-page";

/** Saldo que muestra el header ("1.500" → 1500). Espera a que deje de animar. */
async function headerBalance(app: AppShell) {
  await expect(app.balance).toContainText(/\d/);
  return Number((await app.balance.innerText()).replace(/\D/g, ""));
}

// Stack real (Docker + seed:e2e). Ver e2e/specs/fullstack/fullstack.setup.ts para los requisitos.
test.describe("Smoke full-stack", () => {
  test("la sesión real se restaura al recargar", async ({ app, page, loginAs }) => {
    await loginAs("e2e-user");

    await app.open();
    await expect(app.header.getByText(e2eUsername("e2e-user"))).toBeVisible();

    await page.reload();

    await expect(app.header.getByText(e2eUsername("e2e-user"))).toBeVisible();
    await expect(app.loginButton).toBeHidden();
  });

  test("el rol real habilita el panel de administración", async ({ app, page, loginAs }) => {
    await loginAs("e2e-admin");

    await app.open();
    await app.goToSection("Admin");

    await expect(page.getByRole("tab", { name: /Usuarios/ })).toBeEnabled();
  });

  test("apostar descuenta el saldo y liquidar paga al ganador", async ({ app, page, loginAs, playwright }) => {
    const adminRequest = await playwright.request.newContext();
    const admin = await apiAs(adminRequest, (await devLogin(adminRequest, "e2e-admin")).accessToken);
    const title = `[E2E] ¿Gana el local? ${Date.now()}`;
    const created = await admin.post("/bets/admin/markets", {
      title,
      type: "CUSTOM",
      closesAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      options: [
        { name: "Sí", initialProb: 50 },
        { name: "No", initialProb: 50 },
      ],
    });
    expect(created.ok(), `crear mercado respondió ${created.status()}: ${await created.text()}`).toBeTruthy();
    const market = (await created.json()) as { id: string; options: { id: string; name: string }[] };
    const winner = market.options.find((option) => option.name === "Sí")!;

    try {
      const { accessToken } = await loginAs("e2e-user");
      const balanceResponse = await (await apiAs(page.request, accessToken)).post("/wallet/my-balance");
      const before = Number(await balanceResponse.text());
      const bets = new BetsPage(page);
      await app.open();
      // El header arranca en 0 hasta que carga el wallet.
      await expect.poll(() => headerBalance(app), { timeout: 30_000 }).toBe(before);

      await app.goToSection("Pronósticos");
      await bets.option(title, "Sí").click();
      await bets.showTicket();
      await bets.amountFor("Sí").fill("100");
      await bets.confirmButton.click();

      await expect(page.getByText("¡Apuestas confirmadas con éxito!")).toBeVisible();
      // El saldo baja por el socket `wallet:balance_updated`, sin recargar.
      await expect.poll(() => headerBalance(app), { timeout: 15_000 }).toBe(before - 100);

      // La apuesta se persiste en la DB después, con un job de BullMQ. Liquidar antes de eso
      // lo reembolsaría sin apuestas (ver el reporte del backend-reviewer sobre esa carrera).
      await expect
        .poll(async () => {
          const markets = (await (await admin.get("/bets/markets")).json()) as {
            id: string;
            options: { id: string; totalStaked: number }[];
          }[];
          return markets.find((m) => m.id === market.id)?.options.find((o) => o.id === winner.id)?.totalStaked ?? 0;
        }, { timeout: 15_000 })
        .toBeGreaterThanOrEqual(100);

      const settled = await admin.post(`/bets/admin/markets/${market.id}/settle`, {
        status: "SETTLED",
        winningOptionId: winner.id,
      });
      expect(settled.ok(), `liquidar respondió ${settled.status()}: ${await settled.text()}`).toBeTruthy();
      expect(((await settled.json()) as { status: string }).status).toBe("SETTLED");

      // Único apostador: el pozo real es su propia apuesta, así que cobra exactamente lo que puso.
      // (La cuota de la UI suma un pozo virtual que la liquidación no usa.)
      await expect
        .poll(async () => {
          await page.reload();
          return headerBalance(app);
        }, { timeout: 30_000 })
        .toBeGreaterThanOrEqual(before);
    } finally {
      // Si el test cortó antes de liquidar, no dejar el mercado abierto con monedas retenidas.
      // Si ya se liquidó, el backend responde 400 ("ya fue liquidado") y no pasa nada.
      await admin.post(`/bets/admin/markets/${market.id}/settle`, { status: "REFUNDED" }).catch(() => undefined);
      await adminRequest.dispose();
    }
  });

  test("un mensaje del chat le llega en vivo a otro usuario", async ({ app, page, loginAs, openSecondSession }) => {
    await loginAs("e2e-user");
    const other = await openSecondSession("e2e-user2");
    const message = `[E2E] Vamos que se puede ${Date.now()}`;

    await other.app.open();
    await app.open();
    const chat = new ChatPanel(page);
    await chat.send(message);

    await expect(new ChatPanel(other.page).log.getByText(message)).toBeVisible({ timeout: 15_000 });
  });

  test("comprar un cosmético lo deja en el inventario", async ({ app, page, loginAs }) => {
    await loginAs("e2e-user");
    const store = new StorePage(page);

    await app.open();
    await app.goToSection("Tienda");
    await store.openTab("cosmeticos");
    await store.card("[E2E] Banner").getByRole("button", { name: "Comprar" }).click();
    await store.purchaseDialog.getByRole("button", { name: "Aceptar" }).click();
    await expect(store.purchaseDialog.getByText("¡Compra exitosa! Revisa tu inventario.")).toBeVisible();

    await app.goToSection("Mi Perfil");

    await expect(page.getByRole("article", { name: "[E2E] Banner" })).toBeVisible();
  });
});
