import type { GetYearlyCalendarResponse, MatchFixture } from "@/features/fixture/types";
import { LOCAL_IMAGE, nextId } from "./ids";

export function buildMatchFixture(overrides: Partial<MatchFixture> = {}): MatchFixture {
  return {
    id: nextId("fixture"),
    date: "2026-05-12T20:00:00.000Z",
    home_goals: null,
    away_goals: null,
    home_penalty_goals: null,
    away_penalty_goals: null,
    status_short: "NS",
    elapsed: 0,
    is_live: false,
    is_playoff: false,
    round: "Fecha 10",
    home_team: { name: "Boca Juniors", logo_url: LOCAL_IMAGE },
    away_team: { name: "River Plate", logo_url: LOCAL_IMAGE },
    home_team_id: "team-boca",
    away_team_id: "team-river",
    ...overrides,
  };
}

export function buildCalendar(
  calendar: Record<string, MatchFixture[]> = {},
  season = "2026",
): GetYearlyCalendarResponse {
  return { season, availableDays: Object.keys(calendar).sort(), calendar };
}
