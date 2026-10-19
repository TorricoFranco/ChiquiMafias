import { expect, test } from "../../../fixtures/test";
import { buildTicket, buildTicketDetails, buildTicketMessage } from "../../../factories/support";
import { acceptNextDialog } from "../../../support/dialogs";

const UPLOADED_URL = "https://res.cloudinary.com/e2e-cloud/image/upload/comprobante.png";

test.describe("Soporte y reclamos", () => {
  test("crear un ticket valida los campos, lo envía y abre su detalle", { tag: ["@p0", "@mobile"] }, async ({ app, page, api, session }) => {
    const user = session.loginAs("USER");
    const created = buildTicket({ userId: user.id, category: "APPEAL", subject: "Me mutearon sin motivo" });
    api.on("GET", "/support/my-tickets", []);
    api.on("POST", "/support/ticket", created, { status: 201 });
    api.on("GET", "/support/my-tickets/:id", buildTicketDetails(created, [buildTicketMessage({ senderId: user.id, message: "Estaba hablando del partido y me silenciaron." })]));

    await app.open();
    await app.goToSection("Soporte & Reclamos");
    await page.getByRole("button", { name: "Crear Nuevo Ticket" }).click();
    const modal = page.getByRole("dialog", { name: "Crear Nuevo Reclamo / Ticket" });

    await modal.getByRole("button", { name: "Enviar Reclamo" }).click();
    await expect(modal.getByText("El asunto debe tener al menos 5 caracteres.")).toBeVisible();
    await expect(modal.getByText("El mensaje debe tener al menos 10 caracteres.")).toBeVisible();

    await modal.getByRole("button", { name: /Apelación de Sanción/ }).click();
    await modal.getByLabel(/Asunto del Reclamo/).fill("Me mutearon sin motivo");
    await modal.getByLabel(/Detalle o Explicación/).fill("Estaba hablando del partido y me silenciaron.");
    await modal.getByRole("button", { name: "Enviar Reclamo" }).click();

    await expect(page.getByText("Reclamo registrado con éxito. Estado: Abierto")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Me mutearon sin motivo" })).toBeVisible();
    expect(api.lastRequest("POST", "/support/ticket")?.body).toEqual({
      category: "APPEAL",
      subject: "Me mutearon sin motivo",
      message: "Estaba hablando del partido y me silenciaron.",
    });
  });

  test("el formulario no deja pasar los límites del backend (asunto 100, mensaje 1800)", async ({ app, page, api, session }) => {
    session.loginAs("USER");
    api.on("GET", "/support/my-tickets", []);

    await app.open();
    await app.goToSection("Soporte & Reclamos");
    await page.getByRole("button", { name: "Crear Nuevo Ticket" }).click();
    const modal = page.getByRole("dialog", { name: "Crear Nuevo Reclamo / Ticket" });

    await expect(modal.getByLabel(/Asunto del Reclamo/)).toHaveAttribute("maxlength", "100");
    await expect(modal.getByLabel(/Detalle o Explicación/)).toHaveAttribute("maxlength", "1800");
  });

  test("una captura adjunta se sube a Cloudinary antes de crear el ticket", async ({ app, page, api, session }) => {
    session.loginAs("USER");
    const created = buildTicket();
    api.on("GET", "/support/my-tickets", []);
    api.on("GET", "/uploads/signature", {
      signature: "firma-e2e",
      timestamp: 1_778_000_000,
      cloudName: "e2e-cloud",
      apiKey: "api-key-e2e",
      folder: "support_tickets",
      publicId: "comprobante",
      uploadPreset: "tickets",
      allowedFormats: "png,jpg,webp",
    });
    api.on("POST", "/support/ticket", created, { status: 201 });
    api.on("GET", "/support/my-tickets/:id", buildTicketDetails(created));
    await page.route("https://api.cloudinary.com/**", (route) =>
      route.fulfill({ json: { secure_url: UPLOADED_URL }, headers: { "access-control-allow-origin": "*" } }),
    );

    await app.open();
    await app.goToSection("Soporte & Reclamos");
    await page.getByRole("button", { name: "Crear Nuevo Ticket" }).click();
    const modal = page.getByRole("dialog", { name: "Crear Nuevo Reclamo / Ticket" });
    await modal.getByLabel(/Asunto del Reclamo/).fill("Pago duplicado en Mercado Pago");
    await modal.getByLabel(/Detalle o Explicación/).fill("Me cobraron dos veces el pack de fichas.");
    const fileChooser = page.waitForEvent("filechooser");
    await modal.getByRole("button", { name: "Seleccionar imagen desde tu dispositivo" }).click();
    await (await fileChooser).setFiles({ name: "comprobante.png", mimeType: "image/png", buffer: Buffer.from("png-falso") });
    await expect(modal.getByText("comprobante.png").first()).toBeVisible();
    await modal.getByRole("button", { name: "Enviar Reclamo" }).click();

    await expect(page.getByText("Reclamo registrado con éxito. Estado: Abierto")).toBeVisible();
    expect(api.lastRequest("POST", "/support/ticket")?.body).toMatchObject({ screenshotUrl: UPLOADED_URL });
  });

  test("una imagen de más de 2MB se rechaza", async ({ app, page, api, session }) => {
    session.loginAs("USER");
    api.on("GET", "/support/my-tickets", []);

    await app.open();
    await app.goToSection("Soporte & Reclamos");
    await page.getByRole("button", { name: "Crear Nuevo Ticket" }).click();
    const fileChooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Seleccionar imagen desde tu dispositivo" }).click();
    const alert = acceptNextDialog(page);
    await (await fileChooser).setFiles({ name: "pesada.png", mimeType: "image/png", buffer: Buffer.alloc(2 * 1024 * 1024 + 1) });

    expect(await alert).toBe("La imagen no puede pesar más de 2MB.");
    await expect(page.getByRole("button", { name: "Seleccionar imagen desde tu dispositivo" })).toBeVisible();
  });

  test("en el detalle de un ticket abierto se puede responder", { tag: "@p0" }, async ({ app, page, api, session }) => {
    const user = session.loginAs("USER");
    const ticket = buildTicket({ userId: user.id, subject: "No se acreditaron mis fichas" });
    const thread = [buildTicketMessage({ message: "Hola, ya lo estamos revisando." })];
    api.on("GET", "/support/my-tickets", [ticket]);
    api.on("GET", "/support/my-tickets/:id", () => buildTicketDetails(ticket, thread));
    api.handle("POST", "/support/ticket/:id/message", (req) => {
      thread.push(buildTicketMessage({ senderId: user.id, message: (req.body as { message: string }).message, sender: { id: user.id, username: "hincha_e2e", role: "USER" } }));
      return { status: 201, body: thread.at(-1) };
    });

    await app.open();
    await app.goToSection("Soporte & Reclamos");
    await page.getByRole("button", { name: "Ver ticket: No se acreditaron mis fichas" }).click();
    await expect(page.getByText("Hola, ya lo estamos revisando.")).toBeVisible();

    await page.getByRole("textbox", { name: "Tu respuesta" }).fill("Les paso el número de operación: 123456");
    await page.getByRole("button", { name: "Enviar Mensaje" }).click();

    await expect(page.getByText("Mensaje enviado al hilo de soporte")).toBeVisible();
    await expect(page.getByText("Les paso el número de operación: 123456")).toBeVisible();
  });

  test("un ticket cerrado ya no acepta respuestas", async ({ app, page, api, session }) => {
    session.loginAs("USER");
    const ticket = buildTicket({ subject: "Consulta resuelta", status: "CLOSED" });
    api.on("GET", "/support/my-tickets", [ticket]);
    api.on("GET", "/support/my-tickets/:id", buildTicketDetails(ticket));

    await app.open();
    await app.goToSection("Soporte & Reclamos");
    await page.getByRole("button", { name: "Ver ticket: Consulta resuelta" }).click();

    await expect(page.getByRole("heading", { name: "Ticket Cerrado Definitivamente" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Tu respuesta" })).toBeHidden();
  });

  test("los filtros de la lista separan por estado", async ({ app, page, api, session }) => {
    session.loginAs("USER");
    api.on("GET", "/support/my-tickets", [
      buildTicket({ subject: "Ticket pendiente", status: "OPEN" }),
      buildTicket({ subject: "Ticket ya resuelto", status: "RESOLVED" }),
    ]);

    await app.open();
    await app.goToSection("Soporte & Reclamos");
    await page.getByRole("combobox", { name: "Filtrar por estado" }).selectOption("RESOLVED");

    await expect(page.getByRole("button", { name: "Ver ticket: Ticket ya resuelto" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Ver ticket: Ticket pendiente" })).toBeHidden();
  });
});
