// services/notification.service.ts
import { apiFetch } from "@/lib/apiFetch";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// 1. Contrato unificado que viene del Backend
export interface NotificationItem {
    id: string;
    title: string;
    message: string;
    type: string;          // Ej: 'BET_WON', 'BET_LOST', 'MATCH_STARTING', etc.
    isGlobal: boolean;     // true si viene de GlobalAnnouncement, false si es personal
    readAt: string | null; // Viene como ISO string desde la base de datos (null = no leída)
    createdAt: string;     // ISO string de creación
    referenceId?: string | null;
    metadata?: {
        coins?: number;
        multiplier?: number;
        slug?: string;
        teamBadge?: string;
        [key: string]: any;  // Extensible para el futuro
    } | null;
}

export interface UnreadCountResponse {
    unreadCount: number;
}

export interface MarkAsReadResponse {
    success: boolean;
}

// 2. Capa de Servicios Pura (Object Literal para llamadas limpias)
export const notificationService = {
    /**
     * Obtiene la bandeja de entrada combinada (alertas personales + anuncios del admin)
     * Soporta paginación por query params.
     */
    getInbox: async (page: number = 1, limit: number = 20): Promise<NotificationItem[]> => {
        const response = await apiFetch(`${API_BASE_URL}/notifications?page=${page}&limit=${limit}`);

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
        const response = await apiFetch(`${API_BASE_URL}/notifications/unread-count`);

        if (!response.ok) {
            throw new Error(`Error HTTP al traer contador: ${response.status}`);
        }

        return response.json();
    },

    /**
     * Envía un lote (array) de IDs para marcar como leídos en simultáneo.
     * Sirve tanto para notificaciones personales como para globales.
     */
    markAsRead: async (ids: string[]): Promise<MarkAsReadResponse> => {
        const response = await apiFetch(`${API_BASE_URL}/notifications/read`, {
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