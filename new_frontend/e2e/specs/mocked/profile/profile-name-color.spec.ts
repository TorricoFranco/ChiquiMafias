import { expect, test } from "../../../fixtures/test";

// El username de Mi Perfil usa el mismo color que el nombre en Stats y en el chat.
test.describe("Username en Mi Perfil", () => {
  test("se pinta con el color equipado", { tag: "@mobile" }, async ({ app, page, session }) => {
    session.loginAs("USER", { username: "elmasgrande", activeNameColorId: "color_gold" });

    await app.open();
    await app.goToSection("Mi Perfil");

    const name = page.getByRole("main").getByText("elmasgrande", { exact: true });
    // Los colores con degradé son texto transparente recortado con el fondo.
    await expect(name).toHaveCSS("color", "rgba(0, 0, 0, 0)");
    await expect(name).toHaveCSS("background-clip", "text");
  });

  test("sin color equipado no usa el degradé", { tag: "@mobile" }, async ({ app, page, session }) => {
    session.loginAs("USER", { username: "elmasgrande", activeNameColorId: null });

    await app.open();
    await app.goToSection("Mi Perfil");

    const name = page.getByRole("main").getByText("elmasgrande", { exact: true });
    await expect(name).not.toHaveCSS("background-clip", "text");
    await expect(name).not.toHaveCSS("color", "rgba(0, 0, 0, 0)");
  });
});
