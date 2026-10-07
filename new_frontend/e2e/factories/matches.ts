import type { MatchDetails, MatchMetadata, MatchScore, PreMatchResponse } from "@/features/matches/types";
import { LOCAL_IMAGE, nextId } from "./ids";

/** leagueId que las páginas de partido mandan fijo al backend. */
export const LPF_LEAGUE_ID = "6a2a03c5-1054-49e4-96c3-afd2bca9ebd7";

type MatchOverrides = Omit<Partial<MatchDetails>, "metadata" | "score"> & {
  metadata?: Partial<MatchMetadata>;
  score?: Partial<MatchScore>;
};

export function buildMatchDetails(overrides: MatchOverrides = {}): MatchDetails {
  const { metadata, score, ...rest } = overrides;
  return {
    metadata: {
      id: nextId("match"),
      status: "NS",
      status_long: "Not Started",
      date: "2026-05-12T23:00:00.000Z",
      timestamp: 1_778_626_800,
      referee: "Darío Herrera",
      round: "Fecha 10",
      tournament: "Torneo Clausura",
      venue: { name: "La Bombonera", city: "Buenos Aires", image: null },
      ...metadata,
    },
    score: {
      home: 0,
      away: 0,
      home_penalties: null,
      away_penalties: null,
      elapsed: null,
      summary: { goals: [], redCards: [], lastUpdate: null },
      ...score,
    },
    teams: {
      home: { id: "team-boca", name: "Boca Juniors", logo: LOCAL_IMAGE, short_code: "BOC" },
      away: { id: "team-river", name: "River Plate", logo: LOCAL_IMAGE, short_code: "RIV" },
    },
    lineups: [],
    events: [],
    stats: [],
    isLive: false,
    chatActive: false,
    ...rest,
  };
}

export function buildPreMatch(overrides: Partial<PreMatchResponse> = {}): PreMatchResponse {
  const emptyTable = { home: [], away: [] };
  return {
    history: { homeWins: 3, awayWins: 2, draws: 1, total: 6, lastMatches: [] },
    form: { home: "V-V-E-D-V", away: "D-E-V-V-D" },
    miniTable: { tournament: emptyTable, annual: emptyTable, averages: emptyTable },
    ...overrides,
  };
}
