import { expect, test } from "../../../fixtures/test";
import { GOOGLE_BUTTON_NAME } from "../../../support/third-party";

test.describe("Reclamar recompensas de encuestas", () => {
  test("si el claim falla por una regla de negocio, muestra el motivo y el saldo no cambia", { tag: "@p0" }, async ({ app, page, api, session }) => {
    session.loginAs("USER", {}, { balance: 1000 });
    api.on("GET", "/polls/rewards/pending", { count: 2, potentialCoins: 150 });
    api.on("POST", "/polls/rewards/claim-all", { statusCode: 400, message: "No tenés recompensas pendientes" }, { status: 400 });

    await app.open();
    await app.goToSection("Comunidad");
    await page.getByRole("button", { name: "Reclamar 150" }).click();

    await expect(page.getByText("No tenés recompensas pendientes")).toBeVisible();
    await expect(app.balance).toContainText("1.000");
  });

  test("si el servidor falla, muestra el mensaje en español y no el del servidor", { tag: "@p0" }, async ({ app, page, api, session }) => {
    session.loginAs("USER", {}, { balance: 1000 });
    api.on("GET", "/polls/rewards/pending", { count: 2, potentialCoins: 150 });
    api.on("POST", "/polls/rewards/claim-all", { statusCode: 500, message: "Internal server error" }, { status: 500 });

    await app.open();
    await app.goToSection("Comunidad");
    await page.getByRole("button", { name: "Reclamar 150" }).click();

    await expect(page.getByText("No se pudieron reclamar las recompensas")).toBeVisible();
    await expect(page.getByText("Internal server error")).toHaveCount(0);
    await expect(app.balance).toContainText("1.000");
  });

  test("si cambia la cuenta mientras se reclama, el saldo de la nueva no se infla", { tag: "@p0" }, async ({ app, page, api, session }) => {
    session.loginAs("USER", { username: "hincha_a" }, { balance: 1000 });
    session.allowGoogleLogin({ username: "hincha_b" }, { balance: 500 });
    // Después del claim, las recompensas de la cuenta nueva quedan en 0: su aviso desaparece cuando termina el refetch.
    let claimed = false;
    api.on("GET", "/polls/rewards/pending", () => (claimed ? { count: 0, potentialCoins: 0 } : { count: 2, potentialCoins: 150 }));

    // La respuesta del claim se retiene: el test cambia de cuenta antes de liberarla.
    let releaseClaim!: () => void;
    const claimResponse = new Promise<void>((resolve) => {
      releaseClaim = resolve;
    });
    api.handle("POST", "/polls/rewards/claim-all", async () => {
      await claimResponse;
      return { body: { coinsAwarded: 150 } };
    });

    await app.open();
    await app.goToSection("Comunidad");
    const claimSent = api.waitFor("POST", "/polls/rewards/claim-all");
    await page.getByRole("button", { name: "Reclamar 150" }).click();
    await claimSent;

    await app.goToSection("Ajustes");
    await page.getByRole("button", { name: "Cerrar Sesión" }).click();
    await expect(app.loginButton).toBeVisible();

    await app.loginButton.click();
    await page.getByRole("button", { name: GOOGLE_BUTTON_NAME }).click();
    await expect(app.balance).toContainText("500");
    await expect(page.getByText("¡Tenés recompensas sin reclamar!")).toBeVisible();

    claimed = true;
    releaseClaim();
    // El aviso de la cuenta nueva se oculta recién cuando termina el refetch que dispara el claim, que ocurre después de ajustar el saldo.
    await expect(page.getByText("¡Tenés recompensas sin reclamar!")).toBeHidden();
    await expect(app.balance).toContainText("500");
  });

  test("el claim colgado de la cuenta anterior no bloquea el botón de la cuenta nueva", { tag: "@p0" }, async ({ app, page, api, session }) => {
    session.loginAs("USER", { username: "hincha_a" }, { balance: 1000 });
    session.allowGoogleLogin({ username: "hincha_b" }, { balance: 500 });
    api.on("GET", "/polls/rewards/pending", { count: 2, potentialCoins: 150 });

    // El claim de A no responde hasta que el test lo libere al final.
    let releaseClaim!: () => void;
    const claimResponse = new Promise<void>((resolve) => {
      releaseClaim = resolve;
    });
    api.handle("POST", "/polls/rewards/claim-all", async () => {
      await claimResponse;
      return { body: { coinsAwarded: 150 } };
    });

    await app.open();
    await app.goToSection("Comunidad");
    const claimSent = api.waitFor("POST", "/polls/rewards/claim-all");
    await page.getByRole("button", { name: "Reclamar 150" }).click();
    await claimSent;

    await app.goToSection("Ajustes");
    await page.getByRole("button", { name: "Cerrar Sesión" }).click();
    await expect(app.loginButton).toBeVisible();

    await app.loginButton.click();
    await page.getByRole("button", { name: GOOGLE_BUTTON_NAME }).click();
    await expect(page.getByText("¡Tenés recompensas sin reclamar!")).toBeVisible();

    // El botón de la cuenta nueva sale habilitado: no hereda el "Reclamando..." de la cuenta anterior.
    await expect(page.getByRole("button", { name: "Reclamar 150" })).toBeEnabled();
    releaseClaim();
  });
});
