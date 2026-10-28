import type { GetFixtureMatchdayResponse, MatchFixture, TournamentBracketsResponse } from "@/features/fixture/types";
import type { BracketMatch, PlayoffStageKey } from "@/features/league/type";
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

type BracketTeam = BracketMatch["home_team"];

/** Equipo de un cruce: el backend manda solo el nombre y el escudo, sin id. */
export function buildBracketTeam(name: string): BracketTeam {
  return { name, logo_url: LOCAL_IMAGE };
}

/** Cruce del cuadro de playoffs de la LPF. Sin equipos queda "A confirmar", como lo manda el backend. */
export function buildBracketMatch(
  round: PlayoffStageKey,
  side: BracketMatch["side"],
  position: number,
  overrides: Partial<BracketMatch> = {},
): BracketMatch {
  const tbd: BracketTeam = { name: "A confirmar", logo_url: null };
  return {
    id: `bracket-${round}-${side}-${position}`,
    round,
    position,
    side,
    home_team: tbd,
    away_team: tbd,
    home_goals: null,
    away_goals: null,
    status_short: "NS",
    ...overrides,
  };
}

/**
 * Respuesta de `GET /fixtures/seasons/:season/tournaments/:tournament/brackets`, con las rondas en el
 * orden del backend (octavos, cuartos, semifinal y final). `filled` completa cruces por
 * `"<ronda>:<lado>:<posición>"`, por ejemplo `"final:center:0"`.
 */
export function buildPlayoffBrackets(filled: Record<string, Partial<BracketMatch>> = {}): TournamentBracketsResponse {
  const slot = (round: PlayoffStageKey, side: BracketMatch["side"], position: number) =>
    buildBracketMatch(round, side, position, filled[`${round}:${side}:${position}`]);
  const sides = (round: PlayoffStageKey, perSide: number) =>
    (["left", "right"] as const).flatMap((side) => Array.from({ length: perSide }, (_, p) => slot(round, side, p)));

  return {
    tournament: "CLAUSURA",
    season: "2026",
    brackets: {
      octavos: sides("octavos", 4),
      cuartos: sides("cuartos", 2),
      semifinal: sides("semifinal", 1),
      final: [slot("final", "center", 0)],
    },
  };
}
