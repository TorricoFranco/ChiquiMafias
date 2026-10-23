import type {
  BracketResponse,
  BracketSlot,
  BracketTeam,
  Competition,
} from "@/features/competitions/types";
import { LOCAL_IMAGE } from "./ids";

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
    hasBracket: false,
    season: { year: 2026, label: "2026" },
    ...overrides,
  };
}

/** La Copa Argentina: eliminación directa con cuadro y página en `/torneos/copa-argentina`. */
export function buildCopaArgentina(overrides: Partial<Competition> = {}): Competition {
  return buildCompetition({
    slug: "copa-argentina",
    name: "Copa Argentina",
    shortName: "Copa Argentina",
    format: "ELIMINACION",
    neutralVenue: true,
    stages: ["ELIMINACION"],
    hasStandings: false,
    hasBracket: true,
    ...overrides,
  });
}

const ROUNDS = [
  { key: "32avos", name: "32avos de final", slots: 32 },
  { key: "16avos", name: "16avos de final", slots: 16 },
  { key: "octavos", name: "Octavos de final", slots: 8 },
  { key: "cuartos", name: "Cuartos de final", slots: 4 },
  { key: "semifinal", name: "Semifinal", slots: 2 },
  { key: "final", name: "Final", slots: 1 },
];

export function buildBracketTeam(name: string, overrides: Partial<BracketTeam> = {}): BracketTeam {
  return { id: `team-${name}`, name, logoUrl: LOCAL_IMAGE, apiTeamId: null, ...overrides };
}

/** Llave vacía (por definir) o con lo que se le pase. */
export function buildBracketSlot(position: number, overrides: Partial<BracketSlot> = {}): BracketSlot {
  return {
    position,
    matchId: null,
    date: null,
    status: null,
    isLive: false,
    homeGoals: null,
    awayGoals: null,
    homePenalties: null,
    awayPenalties: null,
    home: null,
    away: null,
    winnerTeamId: null,
    ...overrides,
  };
}

/** `GET /competitions/:slug/bracket` con las 63 llaves; `filled` pisa llaves por `${key}:${lugar}`. */
export function buildBracket(filled: Record<string, Partial<BracketSlot>> = {}): BracketResponse {
  return {
    rounds: ROUNDS.map((round, i) => ({
      order: i + 1,
      key: round.key,
      name: round.name,
      slots: Array.from({ length: round.slots }, (_, p) =>
        buildBracketSlot(p + 1, filled[`${round.key}:${p + 1}`]),
      ),
    })),
  };
}

