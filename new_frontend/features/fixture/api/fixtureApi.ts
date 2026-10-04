import { apiFetch } from "@/lib/apiFetch";
import {
    GetFixtureMatchdayResponse,
    GetYearlyCalendarResponse,
    GetPendingFixturesResponse,
    GetLiveScoresResponse,
    GetActiveMatchdayResponse,
    AvailableStagesResponse,
    TournamentBracketsResponse
} from "../types"


export const fixturesApi = {
    /**
     * Público: Obtener partidos de una jornada o fase específica
     */
    getByMatchday: async (
        season: string, 
        tournament: string, 
        matchday: string
    ): Promise<GetFixtureMatchdayResponse> => {
        const res = await apiFetch(
            `${process.env.NEXT_PUBLIC_API_URL}/fixtures/seasons/${season}/tournaments/${tournament}/matchday/${matchday}`, 
            {
                method: 'GET',
                headers: { "Content-Type": "application/json" },
            }
        );

        if (!res.ok) throw new Error('Error al cargar la jornada del fixture');
        return res.json();
    },

    /**
     * Público: Obtener el calendario completo de la temporada agrupado por días
     */
    getYearlyCalendar: async (season: string): Promise<GetYearlyCalendarResponse> => {
        const res = await apiFetch(
            `${process.env.NEXT_PUBLIC_API_URL}/fixtures/seasons/${season}/calendar`, 
            {
                method: 'GET',
                headers: { "Content-Type": "application/json" },
            }
        );

        if (!res.ok) throw new Error('Error al cargar el calendario anual');
        return res.json();
    },

    /**
     * Obtener partidos pendientes agrupados por jornadas o eliminación directa
     */
    getPendingFixtures: async (
        season: string, 
        tournament: string
    ): Promise<GetPendingFixturesResponse[]> => {
        const res = await apiFetch(
            `${process.env.NEXT_PUBLIC_API_URL}/fixtures/pendings/seasons/${season}/tournaments/${tournament}`, 
            {
                method: 'GET',
                headers: { "Content-Type": "application/json" },
            }
        );

        if (!res.ok) throw new Error('Error al cargar los partidos pendientes');
        return res.json();
    },

    /**
     * Público: Obtener marcadores en vivo
     */
    getLiveScores: async (): Promise<GetLiveScoresResponse[]> => {
        const res = await apiFetch(
            `${process.env.NEXT_PUBLIC_API_URL}/fixtures/live-scores`, 
            {
                method: 'GET',
                headers: { "Content-Type": "application/json" },
            }
        );

        if (!res.ok) throw new Error('Error al cargar los resultados en vivo');
        return res.json();
    },

    /**
     * Público: Obtener la jornada activa por defecto
     */
    getActiveMatchday: async (
        season: string, 
        tournament: string
    ): Promise<GetActiveMatchdayResponse> => {
        const res = await apiFetch(
            `${process.env.NEXT_PUBLIC_API_URL}/fixtures/seasons/${season}/tournaments/${tournament}/active-matchday`, 
            {
                method: 'GET',
                headers: { "Content-Type": "application/json" },
            }
        );

        if (!res.ok) throw new Error('Error al cargar la jornada activa');
        return res.json();
    },

    /**
     * Obtener el árbol de playoffs (Brackets)
     */
    getBrackets: async (
        season: string, 
        tournament: string
    ): Promise<TournamentBracketsResponse> => {
        const res = await apiFetch(
            `${process.env.NEXT_PUBLIC_API_URL}/fixtures/seasons/${season}/tournaments/${tournament}/brackets`, 
            {
                method: 'GET',
                headers: { "Content-Type": "application/json" },
            }
        );

        if (!res.ok) throw new Error('Error al cargar los brackets del torneo');
        return res.json();
    },

    /**
     * Obtener etapas y fechas disponibles
     */
    getAvailableStages: async (
        season: string, 
        tournament: string
    ): Promise<AvailableStagesResponse> => {
        const res = await apiFetch(
            `${process.env.NEXT_PUBLIC_API_URL}/fixtures/seasons/${season}/tournaments/${tournament}/availableStage`, 
            {
                method: 'GET',
                headers: { "Content-Type": "application/json" },
            }
        );

        if (!res.ok) throw new Error('Error al cargar las etapas disponibles');
        return res.json();
    }
};