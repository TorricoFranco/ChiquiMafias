import { apiFetch } from "@/lib/apiFetch";

// ==========================================
// 1. INTERFACES (Tipados basados en tu Prisma)
// ==========================================
export type TicketStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED';
export type TicketCategory = 'SUPPORT' | 'APPEAL' | 'OTHER';
export type ReportReason = 'TOXIC_CHAT' | 'FRAUD' | 'BAD_BEHAVIOR' | 'OTHER';

export interface CreateReportPayload {
  reportedId: string;
  reason: ReportReason;
  details: string;
}

export interface CreateTicketPayload {
  category: TicketCategory;
  subject: string;
  message: string;
  screenshotUrl?: string;
}

export interface TicketMessagePayload {
  message: string;
  screenshotUrl?: string;
}

export interface ResolveReportPayload {
  action: 'BAN' | 'MUTE' | 'WARN' | 'UNBAN';
  durationHours?: number;
  reason?: string;
}

// ==========================================
// 2. SERVICIO FETCH
// ==========================================
export const supportApi = {
  // ----------------------------------------
  // ACCIONES DE USUARIO (User App)
  // ----------------------------------------

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

  // ----------------------------------------
  // ACCIONES DE ADMINISTRADOR (Backoffice)
  // ----------------------------------------

  adminGetReports: async () => {
    const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/support/reports`);
    if (!res.ok) throw new Error('Error al obtener los reportes');
    return res.json();
  },

  adminGetTickets: async (page = 1, limit = 10, status?: TicketStatus, category?: TicketCategory) => {
    // Construimos la query string dinámicamente
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
    if (!res.ok) throw new Error('Error al resolver el reporte');
    return res.json();
  },

  adminGetTicketDetails: async (ticketId: string) => {
    const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/support/ticket/${ticketId}`);
    if (!res.ok) throw new Error('Error al obtener los detalles del ticket (Admin)');
    return res.json();
  },
};