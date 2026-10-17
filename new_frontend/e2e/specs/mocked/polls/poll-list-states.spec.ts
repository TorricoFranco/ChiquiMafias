import { expect, test } from "../../../fixtures/test";
import { buildPoll } from "../../../factories/polls";

test.describe("Tribuna: carga, error y reintento de las encuestas", () => {
  test.beforeEach(async ({ session }) => {
    session.loginAs("USER");
  });

  test("mientras cargan, la tribuna muestra esqueletos y no un texto suelto", async ({ app, page, api }) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const poll = buildPoll({ title: "Encuesta que llega después" });
    api.on("GET", "/polls/active", async () => {
      await gate;
      return [poll];
    });

    await app.open();
    await app.goToSection("Comunidad");

    try {
      await expect(page.getByRole("status").filter({ hasText: "Cargando la tribuna" })).toBeAttached();
    } finally {
      release();
    }

    await expect(page.getByRole("article", { name: poll.title })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "Cargando la tribuna" })).toHaveCount(0);
  });

  test("si las encuestas no cargan, muestra el error con reintento y el reintento las recupera", async ({ app, page, api }) => {
    let failing = true;
    const poll = buildPoll({ title: "Encuesta recuperada" });
    api.handle("GET", "/polls/active", () =>
      failing ? { status: 500, body: { message: "Error interno" } } : { status: 200, body: [poll] },
    );

    await app.open();
    await app.goToSection("Comunidad");

    // TanStack Query reintenta antes de dar el error, así que el aviso tarda unos segundos.
    const alert = page.getByRole("alert").filter({ hasText: "No pudimos cargar las encuestas" });
    await expect(alert).toBeVisible({ timeout: 15_000 });

    failing = false;
    await alert.getByRole("button", { name: "Reintentar" }).click();

    await expect(page.getByRole("article", { name: poll.title })).toBeVisible();
    await expect(alert).toHaveCount(0);
  });
});
