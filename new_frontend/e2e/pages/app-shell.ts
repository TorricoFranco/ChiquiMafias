import { expect, type Locator, type Page } from "@playwright/test";

export type Section =
  | "Chat"
  | "Pronósticos"
  | "Tienda"
  | "Mi Perfil"
  | "Stats"
  | "Admin"
  | "Ajustes"
  | "Soporte & Reclamos";

/** Breakpoint `lg` de Tailwind: por debajo, la barra lateral vive en el menú del header. */
const DESKTOP_MIN_WIDTH = 1024;

/** Header, navegación lateral y estado de sesión: lo que comparte toda la app. */
export class AppShell {
  readonly header: Locator;
  readonly loginButton: Locator;
  readonly balance: Locator;
  /** Barra lateral en escritorio; en móvil, la misma lista dentro del menú abierto. */
  readonly sections: Locator;
  readonly menuButton: Locator;
  readonly menu: Locator;
  readonly mobileNav: Locator;

  constructor(readonly page: Page) {
    this.header = page.getByRole("banner");
    this.loginButton = this.header.getByRole("button", { name: "Iniciar Sesión" });
    this.balance = this.header.getByRole("group", { name: "Saldo de monedas" });
    this.sections = page.getByRole("complementary", { name: "Secciones" });
    this.menuButton = this.header.getByRole("button", { name: "Abrir menú" });
    this.menu = page.getByRole("dialog", { name: "Menú" });
    this.mobileNav = page.getByRole("navigation", { name: "Navegación principal" });
  }

  get isMobileLayout() {
    return (this.page.viewportSize()?.width ?? DESKTOP_MIN_WIDTH) < DESKTOP_MIN_WIDTH;
  }

  /** Navega y espera a que AuthProvider termine de restaurar la sesión (deja de mostrar el spinner). */
  async open(path = "/") {
    await this.page.goto(path);
    await expect(this.header).toBeVisible();
  }

  sectionButton(name: Section) {
    return this.sections.getByRole("button", { name, exact: true });
  }

  /** En móvil abre el menú del header y elige la sección desde ahí. */
  async goToSection(name: Section) {
    if (this.isMobileLayout) await this.openMenu();
    await this.sectionButton(name).click();
  }

  async openMenu() {
    await this.menuButton.click();
    await expect(this.menu).toBeVisible();
  }

  mobileTab(label: "Vivo" | "Tribuna" | "Apuestas" | "Perfil") {
    return this.mobileNav.getByRole("button", { name: label, exact: true });
  }
}
