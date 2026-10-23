import type { Competition } from "@/features/competitions/types";

/** `GET /competitions` de la Liga Profesional 2026. */
export function buildCompetition(overrides: Partial<Competition> = {}): Competition {
  return {
    slug: "liga-profesional",
    name: "Liga Profesional Argentina",
    shortName: "Liga Profesional",
    logoUrl: null,
    country: "Argentina",
    format: "LIGA_DIVIDIDA",
    neutralVenue: false,
    stages: ["APERTURA", "CLAUSURA"],
    hasStandings: true,
    season: { year: 2026, label: "2026" },
    ...overrides,
  };
}

/** La Copa Argentina: tiene temporada actual pero todavía no tiene vista propia. */
export function buildCopaArgentina(overrides: Partial<Competition> = {}): Competition {
  return buildCompetition({
    slug: "copa-argentina",
    name: "Copa Argentina",
    shortName: "Copa Argentina",
    format: "ELIMINACION",
    neutralVenue: true,
    stages: [],
    hasStandings: false,
    ...overrides,
  });
}
