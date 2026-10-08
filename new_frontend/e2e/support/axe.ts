import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, type TestInfo } from "@playwright/test";

type Result = Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"][number];

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

/**
 * Reglas que se reportan pero todavía no hacen fallar el test. `color-contrast` depende de
 * la paleta de DESIGN.md (textos #8E9285 / #3B873E sobre fondos oscuros, badges con opacidad):
 * cambiarla es una decisión de diseño pendiente, no algo que arregle un test.
 */
const REPORT_ONLY_RULES = ["color-contrast"];

const summarize = (violation: Result) =>
  `${violation.id} (${violation.impact}): ${violation.help} → ${violation.nodes
    .slice(0, 5)
    .map((node) => node.target.join(" "))
    .join(" | ")}`;

/**
 * Corre axe sobre la página y falla si hay violaciones `critical` o `serious`.
 * El resultado completo queda adjunto al reporte, y las reglas de REPORT_ONLY_RULES
 * aparecen como anotación del test.
 */
export async function expectNoSeriousA11yViolations(page: Page, testInfo: TestInfo, name: string) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

  await testInfo.attach(`axe-${name}.json`, {
    body: JSON.stringify(results.violations, null, 2),
    contentType: "application/json",
  });

  const serious = results.violations.filter(
    (violation) => violation.impact === "critical" || violation.impact === "serious",
  );

  for (const violation of serious.filter((v) => REPORT_ONLY_RULES.includes(v.id))) {
    testInfo.annotations.push({ type: "a11y (pendiente de diseño)", description: summarize(violation) });
  }

  const blocking = serious.filter((violation) => !REPORT_ONLY_RULES.includes(violation.id)).map(summarize);
  expect(blocking, `Violaciones de accesibilidad en "${name}"`).toEqual([]);
}
