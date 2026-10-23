import { expect, test } from "../../../fixtures/test";

test.describe("Visitante sin sesión", () => {
  test("no pide datos que requieren sesión al cargar la home", { tag: ["@p0", "@mobile"] }, async ({ app, api }) => {
    await app.open();
    await expect(app.loginButton).toBeVisible();
    await api.waitFor("GET", "/competitions/:slug/live", { includePast: true });

    const paths = (method: "GET" | "POST", pattern: string) => api.requests(method, pattern).map((req) => req.path);
    expect(paths("GET", "/inventory")).toHaveLength(0);
    expect(paths("POST", "/auth/refresh"), "un solo intento de restaurar la sesión").toHaveLength(1);
  });

  test("en Mi Perfil ve una invitación a entrar en vez del perfil vacío", { tag: ["@p0", "@mobile"] }, async ({ app, page, api }) => {
    await app.open();

    await app.goToSection("Mi Perfil");

    await expect(page.getByRole("heading", { name: "Entrá para ver tu perfil" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Editar perfil" })).toBeHidden();
    expect(api.requests("GET", "/inventory")).toHaveLength(0);

    await page.getByRole("main").getByRole("button", { name: "Iniciar sesión", exact: true }).click();
    const login = page.getByRole("dialog", { name: "Iniciá sesión" });
    await expect(login).toBeVisible();
    await expect(login).toContainText("Entrá para ver y editar tu perfil.");
  });
});
