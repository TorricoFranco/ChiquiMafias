import type { FullStandingsResponse } from "@/features/standings/types";
import type { GetFixtureMatchdayResponse } from "@/features/fixture/types";
import { buildMatchday, buildStandingRow, buildStandings } from "../factories/league";
import type { ApiMock } from "./api-mock";

const TOURNAMENT = "/fixtures/seasons/:season/tournaments/:tournament";

/** Todo lo que pide la vista de Ligas (LPF) al abrirse. La fecha activa es la 5. */
export function mockLeague(
  api: ApiMock,
  {
    standings = buildStandings([buildStandingRow("Boca Juniors", { points: 30 }), buildStandingRow("River Plate", { position: 2, points: 28 })]),
    matchdays = { "5": buildMatchday("5") },
  }: { standings?: FullStandingsResponse; matchdays?: Record<string, GetFixtureMatchdayResponse> } = {},
) {
  api.on("GET", "/standings/seasons/:season", standings);
  api.on("GET", `${TOURNAMENT}/active-matchday`, { active_matchday: "5" });
  api.on("GET", `${TOURNAMENT}/availableStage`, { regular: [1, 2, 3, 4, 5, 6], playoffs: [] });
  api.on("GET", `${TOURNAMENT}/brackets`, {});
  api.on("GET", "/fixtures/pendings/seasons/:season/tournaments/:tournament", []);
  api.on("GET", `${TOURNAMENT}/matchday/:matchday`, (req) => matchdays[req.params.matchday] ?? buildMatchday(req.params.matchday, []));
}
