import { expect, test } from "../../../fixtures/test";
import { buildMarket } from "../../../factories/bets";
import { buildCalendar, buildMatchFixture } from "../../../factories/fixtures";
import { BetsPage } from "../../../pages/bets-page";
import { ChatPanel } from "../../../pages/chat-panel";
import { BASE_URL } from "../../../support/env";

// La barra inferior y el menú hamburguesa solo existen debajo del breakpoint `lg`.
test.describe("Navegación en móvil", { tag: "@mobile-only" }, () => {
  test("la barra inferior cambia de sección", { tag: "@p0" }, async ({ app, page, api, session }) => {
    session.loginAs("USER", { username: "elmasgrande" });
    const market = buildMarket({ title: "¿Quién gana el superclásico?" });
    api.on("GET", "/bets/markets", [market]);
    api.on("GET", "/fixtures/seasons/:season/calendar", buildCalendar({ "2030-01-15": [buildMatchFixture({ date: "2030-01-15T23:00:00.000Z" })] }));
    const chat = new ChatPanel(page);

    await app.open();

    // La barra lateral de escritorio no ocupa lugar: el chat es lo primero que se ve.
    await expect(app.sections).toBeHidden();
    await expect(chat.input).toBeInViewport();
    await expect(app.mobileTab("Tribuna")).toHaveAttribute("aria-current", "page");

    await app.mobileTab("Apuestas").click();
    await expect(new BetsPage(page).market(market.title)).toBeVisible();
    await expect(app.mobileTab("Apuestas")).toHaveAttribute("aria-current", "page");
    await expect(app.mobileTab("Tribuna")).not.toHaveAttribute("aria-current");

    await app.mobileTab("Vivo").click();
    await expect(page.getByRole("link", { name: "Boca Juniors vs River Plate" })).toBeVisible();

    await app.mobileTab("Perfil").click();
    await expect(page.getByRole("main").getByRole("heading", { name: "elmasgrande" })).toBeVisible();
  });

  test("el menú lleva a las secciones de la barra lateral", { tag: "@p0" }, async ({ app, page, session }) => {
    session.loginAs("USER");

    await app.open();
    await expect(app.menuButton).toHaveAttribute("aria-expanded", "false");
    await app.openMenu();
    await expect(app.menuButton).toHaveAttribute("aria-expanded", "true");

    await app.sectionButton("Tienda").click();

    await expect(app.menu).toBeHidden();
    await expect(page.getByRole("tab", { name: /Packs Chiqui-Coins/ })).toBeVisible();
    // Tienda no está en la barra inferior: ninguna pestaña queda marcada.
    await expect(app.mobileNav.locator("[aria-current]")).toHaveCount(0);
  });

  test("el menú cambia de vista y la barra inferior vuelve a Social", async ({ app, page }) => {
    await app.open();

    await app.openMenu();
    await app.menu.getByRole("button", { name: "Calendario" }).click();

    await expect(app.menu).toBeHidden();
    await expect(page).toHaveURL(`${BASE_URL}/?tab=calendario`);
    await expect(page.getByRole("heading", { name: /Vista Calendario/ })).toBeVisible();

    await app.mobileTab("Tribuna").click();

    await expect(page).toHaveURL(`${BASE_URL}/?tab=social`);
    await expect(new ChatPanel(page).input).toBeVisible();
    await expect(app.mobileTab("Tribuna")).toHaveAttribute("aria-current", "page");
  });

  test("el menú se cierra con Escape y con el botón de cerrar", async ({ app, page }) => {
    await app.open();

    await app.openMenu();
    await page.keyboard.press("Escape");
    await expect(app.menu).toBeHidden();

    await app.openMenu();
    await app.menu.getByRole("button", { name: "Cerrar menú" }).click();
    await expect(app.menu).toBeHidden();
  });

  test("el ticket queda arriba de la barra inferior y se puede confirmar", { tag: "@p0" }, async ({ app, page, api, session }) => {
    session.loginAs("USER", {}, { balance: 1000 });
    const market = buildMarket();
    api.on("GET", "/bets/markets", [market]);
    api.on("POST", "/bets/place", { status: "ok", message: "Apuesta registrada" });
    const bets = new BetsPage(page);

    await app.open();
    await app.mobileTab("Apuestas").click();
    // Sin selecciones no hay barra de ticket ocupando pantalla.
    await expect(bets.mobileTicketToggle).toBeHidden();

    await bets.option(market.title, "Boca").click();

    // La hoja no se abre sola, para poder seguir eligiendo cuotas.
    await expect(bets.mobileTicketToggle).toHaveAttribute("aria-expanded", "false");
    await expect(bets.mobileTicketToggle).toContainText("TICKET (1)");
    await bets.showTicket();

    // El click falla si la barra inferior o el footer tapan el botón.
    await expect(bets.confirmButton).toBeInViewport();
    await bets.confirmButton.click();

    await expect(page.getByText("¡Apuestas confirmadas con éxito!")).toBeVisible();
    expect(api.requests("POST", "/bets/place")).toHaveLength(1);
    await expect(bets.mobileTicketToggle).toBeHidden();
    await expect(app.mobileNav).toBeVisible();
  });
});
