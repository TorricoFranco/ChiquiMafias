import { getBaseUrl } from "./getBaseUrl";
import { BracketsResponse } from "@/types/fixtures";

export async function getBracketsMatch(
    season: string,
    tournament: string
): Promise<BracketsResponse | null> {
    const baseUrl = getBaseUrl();
    try {
        const url = `${baseUrl}/fixtures/seasons/${season}/tournaments/${tournament}/brackets`;
        const res = await fetch(url, {
            cache: 'no-store',
        });

        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);

        return await res.json();
    } catch (error) {
        console.error("Fetch Brackets Error:", error);
        throw error;
    }
}