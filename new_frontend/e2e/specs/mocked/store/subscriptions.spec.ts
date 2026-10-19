import { expect, test } from "../../../fixtures/test";
import { buildPlan } from "../../../factories/store";
import { StorePage } from "../../../pages/store-page";
import { acceptNextDialog } from "../../../support/dialogs";
import { MERCADO_PAGO_MOCK_TITLE, MP_CHECKOUT_URL } from "../../../support/third-party";

const checkoutResponse = {
  init_point: MP_CHECKOUT_URL,
  external_reference: "ext-ref-1",
  subscription_id: "sub-1",
  tier: "TIER_2",
};

test.describe("Suscripciones VIP", () => {
  test("un hincha sin plan se suscribe y va a Mercado Pago", { tag: ["@p0", "@mobile"] }, async ({ app, page, api, session }) => {
    session.loginAs("USER");
    api.on("GET", "/subscriptions/plans", [buildPlan("TIER_1"), buildPlan("TIER_2"), buildPlan("TIER_3")]);
    api.on("POST", "/subscriptions/checkout", checkoutResponse);
    const store = new StorePage(page);

    await app.open();
    await app.goToSection("Tienda");
    await store.card("Platea").getByRole("button", { name: "SUSCRIBIRSE" }).click();

    await expect(page).toHaveTitle(MERCADO_PAGO_MOCK_TITLE);
    expect(api.lastRequest("POST", "/subscriptions/checkout")?.body).toEqual({ tier: "TIER_2" });
  });

  test("con un plan activo, los inferiores se bloquean y los superiores ofrecen mejora", { tag: "@p0" }, async ({ app, page, api, session }) => {
    session.loginAs("USER", { activeSubscriptionTier: "TIER_2" });
    api.on("GET", "/subscriptions/plans", [
      buildPlan("TIER_1"),
      buildPlan("TIER_2", { isCurrent: true }),
      buildPlan("TIER_3", { upgradeRules: { TIER_2_TO_TIER_3: 40 } }),
    ]);
    api.on("POST", "/subscriptions/upgrade", { ...checkoutResponse, new_tier: "TIER_3", bonus_coins: 400, message: "ok" });
    const store = new StorePage(page);

    await app.open();
    await app.goToSection("Tienda");

    await expect(store.card("Popular")).toContainText("PLAN INFERIOR");
    await expect(store.card("Platea")).toContainText("PLAN ACTIVO");
    await expect(store.card("Palco VIP")).toContainText("Bono Exclusivo por Upgrade");
    await store.card("Palco VIP").getByRole("button", { name: "MEJORAR PLAN" }).click();

    await expect(page).toHaveTitle(MERCADO_PAGO_MOCK_TITLE);
    expect(api.lastRequest("POST", "/subscriptions/upgrade")?.body).toEqual({ newTier: "TIER_3" });
  });

  test("si no se puede iniciar la suscripción avisa al usuario", { tag: "@p0" }, async ({ app, page, api, session }) => {
    session.loginAs("USER");
    api.on("GET", "/subscriptions/plans", [buildPlan("TIER_1")]);
    api.on("POST", "/subscriptions/checkout", { statusCode: 500, message: "Error interno" }, { status: 500 });
    const store = new StorePage(page);

    await app.open();
    await app.goToSection("Tienda");
    await store.card("Popular").getByRole("button", { name: "SUSCRIBIRSE" }).click();

    await expect(page.getByText("No pudimos iniciar la suscripción. Probá de nuevo.")).toBeVisible();
  });

  test("se puede cancelar la renovación desde Ajustes", { tag: "@p0" }, async ({ app, page, api, session }) => {
    session.loginAs("USER", { activeSubscriptionTier: "TIER_1" });
    api.on("POST", "/subscriptions/cancel", { status: "ok", message: "Suscripción cancelada" });

    await app.open();
    await app.goToSection("Ajustes");
    await page.getByRole("dialog", { name: "Ajustes" }).getByRole("button", { name: "Cancelar Suscripción" }).click();

    const confirm = page.getByRole("alertdialog", { name: "¿Cancelar suscripción?" });
    const alert = acceptNextDialog(page);
    await confirm.getByRole("button", { name: "Confirmar baja" }).click();

    expect(await alert).toContain("Suscripción cancelada");
    await expect(confirm).toBeHidden();
    expect(api.requests("POST", "/subscriptions/cancel")).toHaveLength(1);
  });
});
