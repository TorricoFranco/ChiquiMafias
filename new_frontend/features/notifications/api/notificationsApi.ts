import { apiFetch } from "@/lib/apiFetch";
import { NotificationItem, UnreadCountResponse, MarkAsReadResponse } from "@/features/notifications/type";


export const notificationService = {
    /**
     * Obtiene la bandeja de entrada combinada (alertas personales + anuncios del admin)
     * Soporta paginación por query params.
     */
    getInbox: async (page: number = 1, limit: number = 20): Promise<NotificationItem[]> => {
        const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications?page=${page}&limit=${limit}`);

        if (!response.ok) {
            throw new Error(`Error HTTP al traer el buzón: ${response.status}`);
        }

        return response.json();
    },

    /**
     * Consulta rápida y liviana para saber cuántas notificaciones pendientes tiene el usuario.
     * Ideal para renderizar el badge flotante arriba de la campanita.
     */
    getUnreadCount: async (): Promise<UnreadCountResponse> => {
        const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/unread-count`);

        if (!response.ok) {
            throw new Error(`Error HTTP al traer contador: ${response.status}`);
        }

        return response.json();
    },

    /**
     * Envía un array de IDs para marcar como leídos en simultáneo.
     * Sirve tanto para notificaciones personales como para globales.
     */
    markAsRead: async (ids: string[]): Promise<MarkAsReadResponse> => {
        const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/read`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ ids }),
        });

        if (!response.ok) {
            throw new Error(`Error HTTP al mutar estado de lectura: ${response.status}`);
        }

        return response.json();
    },
};