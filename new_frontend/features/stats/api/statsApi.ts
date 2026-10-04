import { apiFetch } from "@/lib/apiFetch";
import { UserStats, LeaderboardUserStats, TopChatterUser } from "../types/";

export const statsApi = {
    /**
     * Obtiene las estadísticas completas del usuario autenticado
     */
    getMyStats: async (): Promise<UserStats> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/stats/me`, {
            method: 'GET',
            headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.message || 'Error al obtener mis estadísticas');
        }

        return res.json();
    },

    /**
     * Rankings públicos principales
     */
    getTopEarners: async (limit: number = 10): Promise<LeaderboardUserStats[]> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/stats/top-earners?limit=${limit}`);
        if (!res.ok) throw new Error('Error al cargar ranking de ganancias');
        return res.json();
    },

    getTopStreaks: async (limit: number = 10): Promise<LeaderboardUserStats[]> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/stats/top-streaks?limit=${limit}`);
        if (!res.ok) throw new Error('Error al cargar ranking de rachas');
        return res.json();
    },

    getHighestMultipliers: async (limit: number = 10): Promise<LeaderboardUserStats[]> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/stats/highest-multipliers?limit=${limit}`);
        if (!res.ok) throw new Error('Error al cargar ranking de multiplicadores');
        return res.json();
    },


    getMostActive: async (limit: number = 10): Promise<LeaderboardUserStats[]> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/stats/most-active?limit=${limit}`);
        if (!res.ok) throw new Error('Error al cargar jugadores más activos');
        return res.json();
    },

    getTopStakers: async (limit: number = 10): Promise<LeaderboardUserStats[]> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/stats/top-stakers?limit=${limit}`);
        if (!res.ok) throw new Error('Error al cargar ranking de high rollers');
        return res.json();
    },

    getGlobalStats: async () => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/stats/global`);
        if (!res.ok) throw new Error('Error al cargar estadísticas globales');
        return res.json();
    }, 

    getTopActiveStreaks: async (limit: number = 10): Promise<LeaderboardUserStats[]> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/stats/top-active?limit=${limit}`);
        if (!res.ok) throw new Error('Error al cargar rachas activas');
        return res.json();
    },

    getTopChatters: async (limit: number = 10): Promise<TopChatterUser[]> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/stats/top-chatters?limit=${limit}`);
        if (!res.ok) throw new Error('Error al obtener el top de usuarios del chat');
        return res.json();
    },
};