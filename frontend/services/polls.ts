// src/services/polls.ts
import { apiFetch } from "@/lib/apiFetch";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// Interfaces de datos
export interface PollOption {
  id: number;
  label: string;
  votes: number;
}

export interface Poll {
  id: string;
  title: string;
  description: string | null;
  options: PollOption[];
  status: "PENDING" | "ACTIVE" | "REJECTED" | "CLOSED";
  createdAt: string;
  startsAt: string | null;
  endsAt: string | null;
  icon: string;
  userId?: string | null;
  user?: {
    id: string;
    username: string;
  };
}

// DTOs para las peticiones
export interface ProposePollDto {
  title: string;
  description?: string;
  options: string[]; // El array crudo de textos que escribe el usuario
  icon?: string;
}

export interface ApprovePollDto {
  startsAt: string; // ISO String o datetime
  endsAt: string;
}

export const pollsApi = {
  // 🌍 ENDPOINTS PÚBLICOS / CLIENTE

  // Obtener encuestas activas (Para el feed general)
  getActivePolls: async (): Promise<Poll[]> => {
    const response = await apiFetch(`${API_BASE_URL}/polls/active`);
    if (!response.ok) {
      throw new Error(`Error al traer encuestas activas: ${response.status}`);
    }
    return response.json();
  },

  // Detalle de una encuesta con votos en tiempo real
  getPollWithResults: async (pollId: string, userId?: string | null): Promise<Poll & { hasVoted?: boolean }> => {
    const queryParam = userId ? `?userId=${userId}` : "";
    const response = await apiFetch(`${API_BASE_URL}/polls/${pollId}${queryParam}`);
    if (!response.ok) {
      throw new Error(`Error al traer detalle de la encuesta: ${response.status}`);
    }
    return response.json();
  },

  // Proponer encuesta gastando ticket CUSTOM_POLL
  proposePoll: async (dto: ProposePollDto): Promise<Poll> => {
    const response = await apiFetch(`${API_BASE_URL}/polls/propose`, {
      method: "POST",
      body: JSON.stringify(dto),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error al proponer la encuesta: ${response.status}`);
    }
    return response.json();
  },

  // 🕵️‍♂️ ENDPOINTS EXCLUSIVOS ADMIN

  // Obtener propuestas de usuarios pendientes de moderación
  getPendingPolls: async (): Promise<Poll[]> => {
    const response = await apiFetch(`${API_BASE_URL}/polls/pending`);
    if (!response.ok) {
      throw new Error(`Error de privilegios al traer pendientes: ${response.status}`);
    }
    const pendingPolls = await response.json()
    return pendingPolls
  },

  // Aprobar y activar encuesta agendando fechas
  approvePoll: async (pollId: string, dto: ApprovePollDto): Promise<Poll> => {
    const response = await apiFetch(`${API_BASE_URL}/polls/${pollId}/approve`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    });
    if (!response.ok) {
      throw new Error(`Error al aprobar encuesta: ${response.status}`);
    }
    return response.json();
  },

  // Rechazar encuesta y devolver ticket al usuario
  rejectPoll: async (pollId: string): Promise<{ message: string }> => {
    const response = await apiFetch(`${API_BASE_URL}/polls/${pollId}/reject`, {
      method: "PATCH",
    });
    if (!response.ok) {
      throw new Error(`Error al rechazar encuesta: ${response.status}`);
    }
    return response.json();
  },

  // Cierre manual anticipado de encuesta activa
  closePollManually: async (pollId: string): Promise<{ message: string; pollId: string; status: string }> => {
    const response = await apiFetch(`${API_BASE_URL}/polls/${pollId}/close`, {
      method: "PATCH",
    });
    if (!response.ok) {
      throw new Error(`Error al cerrar la encuesta: ${response.status}`);
    }
    return response.json();
  },


  // Agregar esto dentro de pollsApi en src/services/polls.ts

  // Crear una encuesta directa desde cero (Solo ADMIN)
  createPoll: async (dto: {
    title: string;
    description?: string;
    options: { id: number; label: string }[];
    startsAt: string;
    endsAt: string;
    icon: string;
  }): Promise<Poll> => {
    const response = await apiFetch(`${API_BASE_URL}/polls`, {
      method: "POST",
      body: JSON.stringify(dto),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error al crear la encuesta: ${response.status}`);
    }
    return response.json();
  },

};