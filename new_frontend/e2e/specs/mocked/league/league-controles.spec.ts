import { expect, test } from "../../../fixtures/test";
import { buildMatchDetails, buildMatchEvent, buildPreMatch } from "../../../factories/matches";
import { mockLeague } from "../../../support/league";

const ACTIVE_MATCHDAY = "/fixtures/seasons/:season/tournaments/:tournament/active-matchday";
const MATCHDAY = "/fixtures/seasons/:season/tournaments/:tournament/matchday/:matchday";

test.describe("Ligas: controles del fixture y del menú", () => {
  test("el X del menú de ligas tiene nombre accesible y cierra el menú", { tag: "@mobile-only" }, async ({ app, page, api }) => {
    mockLeague(api);

    await app.open("/?tab=ligas");
    await page.getByRole("button", { name: "Menú Ligas", exact: true }).click();

    const cerrar = page.getByRole("button", { name: "Cerrar menú", exact: true });
    await expect(cerrar).toBeVisible();
    await cerrar.click();
    await expect(cerrar).toBeHidden();
  });

  test("los selectores de torneo y de zona marcan cuál está activo", async ({ app, page, api }) => {
    mockLeague(api);

    await app.open("/?tab=ligas");

    const clausura = page.getByRole("button", { name: "Clausura", exact: true });
    const apertura = page.getByRole("button", { name: "Apertura", exact: true });
    await expect(clausura).toHaveAttribute("aria-pressed", "true");
    await expect(apertura).toHaveAttribute("aria-pressed", "false");

    await apertura.click();
    await expect(apertura).toHaveAttribute("aria-pressed", "true");
    await expect(clausura).toHaveAttribute("aria-pressed", "false");

    const zonaA = page.getByRole("button", { name: "Zona A", exact: true });
    const zonaB = page.getByRole("button", { name: "Zona B", exact: true });
    await expect(zonaA).toHaveAttribute("aria-pressed", "true");
    await zonaB.click();
    await expect(zonaB).toHaveAttribute("aria-pressed", "true");
    await expect(zonaA).toHaveAttribute("aria-pressed", "false");

    // Los selectores de zona de la tabla siguen a la misma zona activa.
    await expect(page.getByRole("button", { name: "ZONA B", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "ZONA A", exact: true })).toHaveAttribute("aria-pressed", "false");
  });

  test("mientras llega la fecha activa no pide la fecha 1 y dice que está cargando", async ({ app, page, api }) => {
    mockLeague(api);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    api.on("GET", ACTIVE_MATCHDAY, async () => {
      await gate;
      return { active_matchday: "5" };
    });

    await app.open("/?tab=ligas");
    await expect(page.getByRole("status").filter({ hasText: "Cargando partidos..." })).toBeVisible();

    release();

    await expect(page.getByText("FECHA 5", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Boca Juniors vs River Plate" })).toBeVisible();
    // Ninguna request pidió la fecha 1 mientras esperaba la activa.
    expect(api.requests("GET", MATCHDAY).map((req) => req.params.matchday)).toEqual(["5"]);
  });

  test("la franja del menú no tapa la última fila del partido en el celular", { tag: "@mobile-only" }, async ({ app, page, api }) => {
    const match = buildMatchDetails({
      metadata: { status: "FT", status_long: "Match Finished" },
      score: { home: 2, away: 1 },
      events: [buildMatchEvent({ minute: 90, detail: "Yellow Card" })],
    });
    api.on("GET", "/matches/:matchId", match);
    api.on("GET", "/matches/pre-match/:matchId", buildPreMatch());

    await app.open(`/match/${match.metadata.id}`);
    const ultimaFila = page.getByText("Tarjeta Amarilla", { exact: true });
    await expect(ultimaFila).toBeVisible();

    // Bajar hasta el final, como el usuario: ahí el botón flotante tapaba la cronología.
    const distanciaAlFinal = () =>
      ultimaFila.evaluate((el) => {
        let scroller = el.parentElement;
        while (scroller && !["auto", "scroll"].includes(getComputedStyle(scroller).overflowY)) {
          scroller = scroller.parentElement;
        }
        return scroller ? scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight : Number.POSITIVE_INFINITY;
      });
    await page.mouse.move(200, 400);
    await page.mouse.wheel(0, 5_000);
    await expect.poll(distanciaAlFinal).toBeLessThanOrEqual(1);

    // No sirve un clic de prueba: si el punto está tapado, Playwright baja la fila y reintenta, y pasa igual.
    // Por eso se mira qué elemento queda encima de la fila, sin mover el scroll.
    const tapadaPorElMenu = () =>
      ultimaFila.evaluate((el) => {
        const { left, top } = el.getBoundingClientRect();
        const encima = document.elementFromPoint(left + 40, top + 11);
        return encima !== null && !el.contains(encima);
      });
    expect(await tapadaPorElMenu(), "el menú flotante tapa la última fila").toBe(false);

    await page.getByRole("button", { name: "Menú Ligas", exact: true }).click();
    await expect(page.getByRole("button", { name: "Cerrar menú", exact: true })).toBeVisible();
  });
});
