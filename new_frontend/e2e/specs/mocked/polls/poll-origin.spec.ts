import { expect, test } from "../../../fixtures/test";
import {
  buildAdminPoll,
  buildOfficialPoll,
  buildPoll,
  buildPollAuthor,
} from "../../../factories/polls";
import { mockAdminPanel } from "../../../support/admin";

test.describe("Origen de las encuestas", () => {
  test("una encuesta oficial se muestra como de la casa y sin ninguna persona", async ({ app, page, api, session }) => {
    session.loginAs("USER");
    const poll = buildOfficialPoll({ title: "La tribuna vota el fichaje del año" });
    api.on("GET", "/polls/active", [poll]);

    await app.open();
    await app.goToSection("Comunidad");
    const card = page.getByRole("article", { name: poll.title });

    await expect(card.getByText("Oficial", { exact: true })).toBeVisible();
    await expect(card.getByText("ChiquiMafias", { exact: true })).toBeVisible();
    await expect(card.getByText("Comunidad", { exact: true })).toHaveCount(0);
    await expect(card.getByText("Juan Tribunero")).toHaveCount(0);
  });

  test("una encuesta de la comunidad muestra el nombre, el escudo y el usuario del autor", async ({ app, page, api, session }) => {
    session.loginAs("USER");
    const poll = buildPoll({ title: "¿Mejor refuerzo del mercado?" });
    api.on("GET", "/polls/active", [poll]);

    await app.open();
    await app.goToSection("Comunidad");
    const card = page.getByRole("article", { name: poll.title });

    await expect(card.getByText("Comunidad", { exact: true })).toBeVisible();
    await expect(card.getByText("Juan Tribunero", { exact: true })).toBeVisible();
    await expect(card.getByText("@tribunero")).toBeVisible();
    await expect(card.getByRole("img", { name: "Escudo de Boca Juniors", exact: true })).toBeVisible();
    await expect(card.getByText("Oficial", { exact: true })).toHaveCount(0);
  });

  test("el autor con suscripción muestra su chapa de abonado y la card conserva su fondo", async ({ app, page, api, session }) => {
    session.loginAs("USER");
    const poll = buildPoll({
      title: "¿Se viene la Libertadores?",
      user: buildPollAuthor({ activeSubscriptionTier: "TIER_2" }),
    });
    api.on("GET", "/polls/active", [poll]);

    await app.open();
    await app.goToSection("Comunidad");
    const card = page.getByRole("article", { name: poll.title });

    await expect(card.getByText("PLATEÍSTA", { exact: true })).toBeVisible();
    // El destaque es un anillo: el fondo de la card no puede cambiar.
    await expect(card).toHaveCSS("background-color", "rgb(28, 27, 27)");
  });

  test("sin equipo elegido, el autor cae a sus iniciales", async ({ app, page, api, session }) => {
    session.loginAs("USER");
    const poll = buildPoll({
      title: "¿Quién se va al descenso?",
      user: buildPollAuthor({ team: null }),
    });
    api.on("GET", "/polls/active", [poll]);

    await app.open();
    await app.goToSection("Comunidad");
    const card = page.getByRole("article", { name: poll.title });

    await expect(card.getByText("JU", { exact: true })).toBeVisible();
    await expect(card.getByRole("img", { name: "Escudo de Boca Juniors", exact: true })).toHaveCount(0);
  });

  test("si la cuenta de una encuesta de la comunidad ya no existe, no se atribuye a la casa", async ({ app, page, api, session }) => {
    session.loginAs("USER");
    const poll = buildPoll({ title: "Encuesta de una cuenta borrada", user: null, isOfficial: false });
    api.on("GET", "/polls/active", [poll]);

    await app.open();
    await app.goToSection("Comunidad");
    const card = page.getByRole("article", { name: poll.title });

    await expect(card.getByText("Autor no disponible", { exact: true })).toBeVisible();
    await expect(card.getByText("Comunidad", { exact: true })).toBeVisible();
    await expect(card.getByText("Oficial", { exact: true })).toHaveCount(0);
  });

  test("en el panel de moderación se ve quién propuso cada encuesta pendiente", async ({ app, page, api, session }) => {
    session.loginAs("MODERATOR");
    mockAdminPanel(api);
    const pending = buildAdminPoll({ title: "¿Vuelve Riquelme a jugar?" });
    api.on("GET", "/polls/pending", [pending]);

    await app.open();
    await app.goToSection("Admin");
    const card = page.getByRole("article", { name: pending.title });

    await expect(card.getByText("Juan Tribunero", { exact: true })).toBeVisible();
    await expect(card.getByText("Comunidad", { exact: true })).toBeVisible();
  });

  test("en el panel, una oficial pendiente muestra quién la publicó y no el chip de comunidad", async ({ app, page, api, session }) => {
    session.loginAs("MODERATOR");
    mockAdminPanel(api);
    const pending = buildAdminPoll({
      title: "¿Vuelve Riquelme a jugar?",
      isOfficial: true,
      user: null,
      createdByAdmin: { id: "mod-1", name: "Mod Pérez", username: "modperez" },
    });
    api.on("GET", "/polls/pending", [pending]);

    await app.open();
    await app.goToSection("Admin");
    const card = page.getByRole("article", { name: pending.title });

    await expect(card.getByText("Oficial", { exact: true })).toBeVisible();
    await expect(card.getByText("Publicada por @modperez", { exact: true })).toBeVisible();
    await expect(card.getByText("Comunidad", { exact: true })).toHaveCount(0);

    await card.getByRole("button", { name: "Aprobar" }).click();
    await expect(page.getByRole("dialog", { name: "Aprobar Encuesta" }).getByText("Encuesta oficial", { exact: true })).toBeVisible();
  });
});
