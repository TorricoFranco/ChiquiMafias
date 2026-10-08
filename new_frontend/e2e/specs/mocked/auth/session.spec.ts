import { expect, test } from "../../../fixtures/test";
import { buildCheckIn } from "../../../factories/stats";
import { buildStreakTimeline } from "../../../factories/streak";
import { buildTeam } from "../../../factories/teams";
import { GOOGLE_BUTTON_NAME } from "../../../support/third-party";
import { ApiMock } from "../../../support/api-mock";
import { installDefaults } from "../../../support/defaults";
import { SocketMock } from "../../../support/socket-io-mock";
import { AppShell } from "../../../pages/app-shell";

test.describe("Sesión", () => {
  test("un visitante ve el botón de login y abre el modal", { tag: ["@p0", "@mobile"] }, async ({ app, page }) => {
    await app.open();

    await app.loginButton.click();

    await expect(page.getByRole("dialog", { name: "Iniciá sesión" })).toBeVisible();
  });

  test("una sesión guardada se restaura con usuario y saldo", { tag: "@p0" }, async ({ app, session }) => {
    session.loginAs("USER", { username: "elmasgrande" }, { balance: 1500 });

    await app.open();

    await expect(app.header.getByText("elmasgrande")).toBeVisible();
    await expect(app.balance).toContainText("1.500");
    await expect(app.loginButton).toBeHidden();
  });

  test("el login con Google de un usuario existente cierra el modal", { tag: "@p0" }, async ({ app, page, session }) => {
    session.allowGoogleLogin({ username: "hincha_de_siempre" });
    await app.open();

    await app.loginButton.click();
    const dialog = page.getByRole("dialog", { name: "Iniciá sesión" });
    await dialog.getByRole("button", { name: GOOGLE_BUTTON_NAME }).click();

    await expect(dialog).toBeHidden();
    await expect(app.header.getByText("hincha_de_siempre")).toBeVisible();
  });

  test("el primer login pide usuario y club antes de entrar", { tag: "@p0" }, async ({ app, page, session, api }) => {
    session.allowGoogleLogin({ isFirstLogin: true, username: null, team: null, teamId: null });
    const racing = buildTeam({ name: "Racing Club" });
    api.on("GET", "/teams", [racing, buildTeam({ name: "Chacarita Juniors", tier: 2 })]);
    api.on("PUT", "/users/complete-profile", () => ({
      ...session.user,
      username: "academia1903",
      isFirstLogin: false,
      termsAcceptedAt: "2026-10-08T12:00:00.000Z",
      team: { id: racing.id, name: racing.name, slug: "racing-club", badgeUrl: racing.badgeUrl },
    }));
    await app.open();

    await app.loginButton.click();
    await page.getByRole("button", { name: GOOGLE_BUTTON_NAME }).click();
    const onboarding = page.getByRole("dialog", { name: "Completá tu perfil" });

    await onboarding.getByRole("button", { name: "Empezar a chatear" }).click();
    await expect(onboarding.getByText("Por favor, ingresá un nombre de usuario.")).toBeVisible();

    await onboarding.getByLabel("Nombre de Usuario").fill("academia1903");
    await onboarding.getByRole("button", { name: /Seleccioná tu club/ }).click();
    await page.getByRole("dialog", { name: "Elegí tu Club" }).getByRole("button", { name: "Racing Club" }).click();

    await onboarding.getByRole("button", { name: "Empezar a chatear" }).click();
    await expect(onboarding.getByText("Tenés que aceptar los Términos y confirmar que sos mayor de 18 años.")).toBeVisible();
    expect(api.lastRequest("PUT", "/users/complete-profile")).toBeUndefined();

    await onboarding.getByRole("checkbox", { name: /Soy mayor de 18 años/ }).check();
    await onboarding.getByRole("button", { name: "Empezar a chatear" }).click();

    await expect(onboarding).toBeHidden();
    await expect(app.header.getByText("academia1903")).toBeVisible();
    expect(api.lastRequest("PUT", "/users/complete-profile")?.body).toEqual({
      username: "academia1903",
      teamId: racing.id,
      acceptTerms: true,
    });
  });

  test("un usuario existente sin aceptación debe aceptar los términos para seguir", { tag: "@p0" }, async ({ app, page, session, api }) => {
    session.loginAs("USER", { username: "veterano", termsAcceptedAt: null });
    api.on("POST", "/users/accept-terms", () => ({
      termsAcceptedAt: "2026-10-08T12:00:00.000Z",
      termsVersion: "2026-10",
    }));
    await app.open();

    const gate = page.getByRole("dialog", { name: "Actualizamos nuestros términos" });
    await expect(gate).toBeVisible();

    await gate.getByRole("button", { name: "Aceptar y continuar" }).click();
    await expect(gate.getByText("Tenés que aceptar los Términos y confirmar que sos mayor de 18 años.")).toBeVisible();

    await gate.getByRole("checkbox", { name: /Soy mayor de 18 años/ }).check();
    await gate.getByRole("button", { name: "Aceptar y continuar" }).click();

    await expect(gate).toBeHidden();
    expect(api.lastRequest("POST", "/users/accept-terms")?.body).toEqual({ acceptTerms: true });
  });

  test("un usuario que aceptó una versión vieja de los términos vuelve a aceptar", { tag: "@p0" }, async ({ app, page, session, api }) => {
    session.loginAs("USER", { termsAcceptedAt: "2025-01-10T12:00:00.000Z", termsVersion: "2025-01" });
    api.on("POST", "/users/accept-terms", () => ({
      termsAcceptedAt: "2026-10-08T12:00:00.000Z",
      termsVersion: "2026-10",
    }));
    await app.open();

    const gate = page.getByRole("dialog", { name: "Actualizamos nuestros términos" });
    await expect(gate).toBeVisible();

    await gate.getByRole("checkbox", { name: /Soy mayor de 18 años/ }).check();
    await gate.getByRole("button", { name: "Aceptar y continuar" }).click();

    await expect(gate).toBeHidden();
  });

  test("cerrar sesión desde Ajustes vuelve al modo visitante", { tag: ["@p0", "@mobile"] }, async ({ app, page, session, api }) => {
    session.loginAs("USER");
    await app.open();

    await app.goToSection("Ajustes");
    await page.getByRole("dialog", { name: "Ajustes" }).getByRole("button", { name: "Cerrar Sesión" }).click();

    await expect(app.loginButton).toBeVisible();
    expect(api.requests("POST", "/auth/logout")).toHaveLength(1);
  });

  test("si vence el access token, renueva la sesión y reintenta con el token nuevo", { tag: "@p0" }, async ({ app, page, session, api }) => {
    session.loginAs("USER", {}, { balance: 1000 });
    api.on("GET", "/subscriptions/streak/timeline", buildStreakTimeline({ streakRewardClaimed: true }));
    await app.open();
    await expect(app.balance).toContainText("1.000");

    session.expireAccessToken();
    await app.header.getByRole("button", { name: /Racha Diaria/ }).click();

    await expect(page.getByRole("dialog", { name: "Racha diaria" }).getByRole("button", { name: "Premio Reclamado" })).toBeVisible();
    expect(api.lastRequest("GET", "/subscriptions/streak/timeline")?.headers.authorization).toBe(`Bearer ${session.token}`);
  });

  test("dos pestañas que restauran la sesión a la vez no se cierran la sesión entre sí", { tag: "@p0" }, async ({ app, page, context, api, session }) => {
    session.loginAs("USER", { username: "hincha_de_dos_pestanas" });
    const tabB = await context.newPage();
    const tabBErrors: string[] = [];
    tabB.on("pageerror", (error) => tabBErrors.push(error.message));
    const apiB = new ApiMock(tabB);
    await apiB.install();
    session.install(apiB);
    installDefaults(apiB, session);
    await new SocketMock(tabB).install();
    const rotation = session.rotateRefreshWithoutGrace([
      { api, page },
      { api: apiB, page: tabB },
    ]);

    const appB = new AppShell(tabB);
    await Promise.all([app.open(), appB.open()]);

    await expect(app.header.getByText("hincha_de_dos_pestanas")).toBeVisible();
    await expect(appB.header.getByText("hincha_de_dos_pestanas")).toBeVisible();
    expect(rotation.crossings, "las dos pestañas intentaron renovar a la vez").toBeGreaterThan(0);
    expect(api.requests("POST", "/auth/refresh"), "la pestaña A renovó una sola vez").toHaveLength(1);
    expect(apiB.requests("POST", "/auth/refresh"), "la pestaña B renovó una sola vez").toHaveLength(1);
    expect(api.requests("POST", "/auth/logout"), "la pestaña A no cerró la sesión").toHaveLength(0);
    expect(apiB.requests("POST", "/auth/logout"), "la pestaña B no cerró la sesión").toHaveLength(0);
    expect(tabBErrors, "errores no capturados en la pestaña B").toEqual([]);
    apiB.assertNoUnhandled();
  });
});

test.describe("Racha diaria", () => {
  test("se abre sola cuando hay premio y se puede reclamar", { tag: "@p0" }, async ({ app, page, session, api }) => {
    session.loginAs("USER");
    api.on("POST", "/subscriptions/streak/check-in", buildCheckIn({ incremented: true, currentStreak: 4, canClaimReward: true }));
    api.on("GET", "/subscriptions/streak/timeline", buildStreakTimeline({ currentStreak: 4 }));
    api.on("POST", "/subscriptions/streak/claim", { status: "ok", coinsAwarded: 200, cosmeticAwarded: null, currentStreak: 4 });

    await app.open();
    const streak = page.getByRole("dialog", { name: "Racha diaria" });
    await streak.getByRole("button", { name: "Reclamar Premio" }).click();

    await expect(streak.getByRole("heading", { name: "+200 Chiqui Coins" })).toBeVisible();
    await streak.getByRole("button", { name: "Continuar" }).click();
    await expect(streak).toBeHidden();
  });

  test("no se abre sola si el premio de hoy ya se reclamó", async ({ app, page, session }) => {
    session.loginAs("USER");

    await app.open();

    await expect(app.header.getByRole("button", { name: /Racha Diaria/ })).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Racha diaria" })).toBeHidden();
  });
});
