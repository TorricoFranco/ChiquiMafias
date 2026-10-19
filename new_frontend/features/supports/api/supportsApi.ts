import { apiFetch } from "@/lib/apiFetch";
import {
    CreateReportPayload,
    TicketStatus,
    TicketCategory,
    ResolveReportPayload,
    CreateTicketPayload,
    TicketMessagePayload,
    ReportStatus,
    AdminReport,
    AdminTicket,
    PaginatedResponse
} from "../types/index";

export const supportApi = {

    createReport: async (data: CreateReportPayload) => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/support/report`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Error al crear el reporte');
        return res.json();
    },

    createTicket: async (data: CreateTicketPayload) => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/support/ticket`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Error al abrir el ticket');
        return res.json();
    },

    replyToTicket: async (ticketId: string, data: TicketMessagePayload) => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/support/ticket/${ticketId}/message`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Error al enviar el mensaje');
        return res.json();
    },

    getMyTickets: async () => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/support/my-tickets`);
        if (!res.ok) throw new Error('Error al obtener tus tickets');
        return res.json();
    },

    getMyTicketDetails: async (ticketId: string) => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/support/my-tickets/${ticketId}`);
        if (!res.ok) throw new Error('Error al obtener los detalles del ticket');
        return res.json();
    },

    //   ADMIN

    adminGetReports: async (page = 1, limit = 10, status?: ReportStatus): Promise<PaginatedResponse<AdminReport>> => {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (status) params.append('status', status);

        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/support/reports?${params.toString()}`);
        if (!res.ok) throw new Error('Error al obtener los reportes');
        return res.json();
    },

    adminGetTickets: async (page = 1, limit = 10, status?: TicketStatus, category?: TicketCategory): Promise<PaginatedResponse<AdminTicket>> => {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (status) params.append('status', status);
        if (category) params.append('category', category);

        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/support/tickets?${params.toString()}`);
        if (!res.ok) throw new Error('Error al obtener los tickets');
        return res.json();
    },

    adminUpdateTicketStatus: async (ticketId: string, status: TicketStatus) => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/support/ticket/${ticketId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
        if (!res.ok) throw new Error('Error al actualizar el ticket');
        return res.json();
    },

    adminResolveReport: async (reportId: string, data: ResolveReportPayload) => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/support/report/${reportId}/resolve`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.message || 'Error al resolver el reporte');
        }
        return res.json();
    },

    adminGetTicketDetails: async (ticketId: string) => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/support/ticket/${ticketId}`);
        if (!res.ok) throw new Error('Error al obtener los detalles del ticket (Admin)');
        return res.json();
    },

    getSupportStats: async (): Promise<{ openTickets: number; pendingReports: number }> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/support/admin/stats`);
        if (!res.ok) throw new Error('Error al obtener las estadísticas de soporte');
        return res.json();
    },
};
