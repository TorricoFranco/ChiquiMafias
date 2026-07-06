import { getBaseUrl } from "./getBaseUrl";
import { LiveScore } from "@/types/fixtures";

export const fetchLiveScores = async (): Promise<LiveScore[]> => {
    const baseUrl = getBaseUrl();
    try {
        const res = await fetch(`${baseUrl}/fixtures/live-scores`);
        if (!res.ok) throw new Error('Error al obtener puntuaciones en vivo');
        return res.json();
    } catch (error) {
        console.error("Fetch Live Scores Error:", error);
        throw error;
    }
};