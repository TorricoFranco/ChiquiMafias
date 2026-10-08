import { apiFetch } from "@/lib/apiFetch";
import { AcceptTermsResponse, CompleteProfileDto } from "../types";

export const authApi = {
    completeProfile: async (dto: CompleteProfileDto) => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/users/complete-profile`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(dto),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.message || "El nombre de usuario ya existe o hubo un error.");
        }

        return res.json();
    },

    acceptTerms: async (): Promise<AcceptTermsResponse> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/users/accept-terms`, {
            method: "POST",
            body: JSON.stringify({ acceptTerms: true }),
        });

        if (!res.ok) throw new Error("No se pudo registrar la aceptación");
        return res.json();
    },

    logout: async () => {
        return await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {
            method: "POST",
            credentials: "include",
        });
    },

    getPublicProfile: async (userId: string) => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${userId}/public-profile`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.message || "Error al cargar el perfil del usuario");
        }

        return res.json();
    }
};