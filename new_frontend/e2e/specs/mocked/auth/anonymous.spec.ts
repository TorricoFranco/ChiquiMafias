import { expect, test } from "../../../fixtures/test";

test.describe("Visitante sin sesión", () => {
  test("no pide datos que requieren sesión al cargar la home", { tag: ["@p0", "@mobile"] }, async ({ app, api }) => {
    await app.open();
    await expect(app.loginButton).toBeVisible();
    await api.waitFor("GET", "/fixtures/live-scores", { includePast: true });

    const paths = (method: "GET" | "POST", pattern: string) => api.requests(method, pattern).map((req) => req.path);
    expect(paths("GET", "/stats/me")).toHaveLength(0);
    expect(paths("GET", "/inventory")).toHaveLength(0);
    expect(paths("POST", "/auth/refresh"), "un solo intento de restaurar la sesión").toHaveLength(1);
  });
});
