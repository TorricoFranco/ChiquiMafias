import { apiFetch } from "@/lib/apiFetch";

import { FootballTeamUserProfile } from "../types";

export const teamsApi = {
    getTeams: async (): Promise<FootballTeamUserProfile[]> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/teams`);
        if (!res.ok) throw new Error('Error al cargar los clubes');
        return res.json();
    },
};