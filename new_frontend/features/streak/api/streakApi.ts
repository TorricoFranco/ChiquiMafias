import { apiFetch } from "@/lib/apiFetch";
import { CheckInResponse, StreakTimelineResponse } from "../types";


export const streakApi = {
    /**
     * Ejecuta el check-in automático 
     */
    checkIn: async (): Promise<CheckInResponse> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/subscriptions/streak/check-in`, {
            method: 'POST',
        });
        if (!res.ok) throw new Error('Error en el check-in de racha');
        return res.json();
    },

    /**
     * Reclama el premio del día actual
     */
    claimReward: async (): Promise<{ status: string; coinsAwarded: number; cosmeticAwarded: string | null; currentStreak: number }> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/subscriptions/streak/claim`, {
            method: 'POST',
        });
        if (!res.ok) throw new Error('Error al reclamar la recompensa diaria');
        return res.json();
    },

    /**
     * Trae el camino de recompensas de 7 días
     */
    getTimeline: async (): Promise<StreakTimelineResponse> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/subscriptions/streak/timeline`, {
            method: 'GET',
        });
        if (!res.ok) throw new Error('Error al obtener el timeline de racha');
        return res.json();
    },
};