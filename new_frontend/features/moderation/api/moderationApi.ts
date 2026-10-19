import { apiFetch } from "@/lib/apiFetch";

export const moderationApi = {
    timeout: async (userId: string, durationMinutes: number) => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/moderation/timeout`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, durationMinutes }),
        });

        if (!res.ok) {
            throw new Error("Error al mutear al usuario");
        }

        return res.json();
    },

    unmute: async (userId: string) => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/moderation/unmute`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId }),
        });

        if (!res.ok) {
            throw new Error("No se pudo quitar el muteo");
        }

        return res.json();
    },
};