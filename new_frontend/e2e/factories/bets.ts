import type { Market, MarketOption } from "@/features/bets/types";
import { nextId } from "./ids";

export function buildOption(overrides: Partial<MarketOption> = {}): MarketOption {
  return { id: nextId("option"), name: "Local", currentOdds: 2, initialProb: 50, totalStaked: 0, ...overrides };
}

export function buildMarket(overrides: Partial<Market> = {}): Market {
  return {
    id: nextId("market"),
    title: "¿Quién gana el Superclásico?",
    type: "CUSTOM",
    category: "Liga Profesional",
    description: null,
    metadata: null,
    status: "OPEN",
    fixtureId: null,
    closesAt: "2026-05-12T23:00:00.000Z",
    options: [
      buildOption({ name: "Boca", currentOdds: 2.1 }),
      buildOption({ name: "Empate", currentOdds: 3.2 }),
      buildOption({ name: "River", currentOdds: 2.5 }),
    ],
    ...overrides,
  };
}

export function buildMatchMarket(overrides: Partial<Market> = {}): Market {
  return buildMarket({
    title: "Boca vs River - Resultado final",
    type: "MATCH",
    category: null,
    fixtureId: 1001,
    metadata: {
      homeTeam: { name: "Boca Juniors", short: "BOC", logoUrl: "boca" },
      awayTeam: { name: "River Plate", short: "RIV", logoUrl: "river" },
    },
    ...overrides,
  });
}
