import type { GetFixtureMatchdayResponse, MatchFixture } from "@/features/fixture/types";
import type { FullStandingsResponse, StandingRow } from "@/features/standings/types";
import { LOCAL_IMAGE } from "./ids";
import { buildMatchFixture } from "./fixtures";

export function buildStandingRow(teamName: string, overrides: Partial<StandingRow> = {}): StandingRow {
  return {
    position: 1,
    teamId: `team-${teamName.toLowerCase().replace(/\s+/g, "-")}`,
    teamName,
    teamLogo: LOCAL_IMAGE,
    points: 0,
    played: 0,
    won: 0,
    draw: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDiff: 0,
    description: null,
    ...overrides,
  };
}

/** Respuesta de `GET /standings/seasons/:season` con la misma zona A en Apertura y Clausura. */
export function buildStandings(zoneA: StandingRow[], zoneB: StandingRow[] = []): FullStandingsResponse {
  return {
    apertura: { tournament: "APERTURA", groups: { A: zoneA, B: zoneB } },
    clausura: { tournament: "CLAUSURA", groups: { A: zoneA, B: zoneB } },
    annual: zoneA,
    averages: [],
    updated_at: "2026-05-10T12:00:00.000Z",
  };
}

export function buildMatchday(matchday: string, matches: MatchFixture[] = [buildMatchFixture()]): GetFixtureMatchdayResponse {
  return { tournament: "CLAUSURA", season: "2026", current_matchday: matchday, matches };
}
