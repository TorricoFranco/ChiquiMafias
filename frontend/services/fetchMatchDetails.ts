import { getBaseUrl } from "./getBaseUrl";
import { MatchDetailsResponse } from "@/types/matchDetails";

export async function getMatchDetails(
  matchId: string
): Promise<MatchDetailsResponse | null> {
  const baseUrl = getBaseUrl();
  const leagueId =
    process.env.NEXT_PUBLIC_ARGENTINA_LEAGUE_ID ||
    "6a2a03c5-1054-49e4-96c3-afd2bca9ebd7";

  try {
    const url = `${baseUrl}/matches/leagues/${leagueId}/seasons/2026/matches/${matchId}`;

    const res = await fetch(url, {
      next: { revalidate: 60 },
    });

    if (res.status === 404) return null;

    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${res.statusText}`);
    }

    return await res.json();
  } catch (error) {
    console.error("Fetch Match Details Error:", error);
    throw error;
  }
}