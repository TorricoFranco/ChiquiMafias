import { getBaseUrl } from "./getBaseUrl";
import { PreMatchResponse } from "@/types/preMatch";

export async function getPreMatchInfo(
    matchId: string
): Promise<PreMatchResponse> {
    const baseUrl = getBaseUrl();
    try {
        const res = await fetch(`${baseUrl}/matches/pre-match/${matchId}`);

        if (!res.ok) throw new Error("Error al obtener datos pre-match");

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("Fetch Pre-Match Error:", error);
        throw error;
    }
}