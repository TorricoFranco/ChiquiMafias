import { getBaseUrl } from "./getBaseUrl";
import { FixtureResponse } from "@/types/fixtures";

export const getActiveMatchday = async (
    season: string,
    tournament: string
): Promise<FixtureResponse> => {
    const baseUrl = getBaseUrl();
    try {
        const res = await fetch(
            `${baseUrl}/fixtures/seasons/${season}/tournaments/${tournament}/active-matchday`
        );
        if (!res.ok) throw new Error('Error al obtener fecha activa');
        return res.json();
    } catch (error) {
        console.error("Fetch Active Matchday Error:", error);
        throw error;
    }
};

export const getFixtureByMatchday = async (
    season: string,
    tournament: string,
    matchday: number
): Promise<FixtureResponse> => {
    const baseUrl = getBaseUrl();
    try {
        const res = await fetch(
            `${baseUrl}/fixtures/seasons/${season}/tournaments/${tournament}/matchday/${matchday}`
        );
        if (!res.ok) throw new Error('Error al cargar la fecha');
        return res.json();
    } catch (error) {
        console.error("Fetch Fixture By Matchday Error:", error);
        throw error;
    }
};