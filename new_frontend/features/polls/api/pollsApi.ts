import { apiFetch } from "@/lib/apiFetch";
import {
    Poll,
    ProposePollDto,
    ApprovePollDto,
    CreateCommentDto,
    ReactDto,
    Comment,
    PaginatedComments
} from "../types";

export const pollsApi = {

    // Obtener encuestas activas
    getActivePolls: async (): Promise<Poll[]> => {
        const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/polls/active`);
        if (!response.ok) {
            throw new Error(`Error al traer encuestas activas: ${response.status}`);
        }
        return response.json();
    },

    // Obtener historial de encuestas cerradas con paginado
    getClosedPolls: async (page: number = 1, limit: number = 10) => {
        const response = await apiFetch(
            `${process.env.NEXT_PUBLIC_API_URL}/polls/history?page=${page}&limit=${limit}`
        );
        if (!response.ok) {
            throw new Error(`Error al traer el historial de encuestas: ${response.status}`);
        }
        return response.json();
    },

    // Obtener comentarios de una encuesta
    getPollComments: async (
        pollId: string,
        page: number = 1,
        limit: number = 20
    ): Promise<PaginatedComments> => {
        const response = await apiFetch(
            `${process.env.NEXT_PUBLIC_API_URL}/polls/${pollId}/comments?page=${page}&limit=${limit}`
        );
        if (!response.ok) {
            throw new Error(`Error al traer los comentarios: ${response.status}`);
        }
        return response.json();
    },

    // --- ACCIONES DE USUARIO ---

    // Proponer encuesta gastando ticket CUSTOM_POLL
    proposePoll: async (dto: ProposePollDto): Promise<Poll> => {
        const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/polls/propose`, {
            method: "POST",
            body: JSON.stringify(dto),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Error al proponer la encuesta: ${response.status}`);
        }
        return response.json();
    },

    // Comentar en una encuesta
    addComment: async (pollId: string, dto: CreateCommentDto): Promise<Comment> => {
        const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/polls/${pollId}/comments`, {
            method: "POST",
            body: JSON.stringify(dto),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Error al agregar comentario');
        }
        return response.json();
    },

    // Dar Like o Dislike a una encuesta
    reactToPoll: async (pollId: string, dto: ReactDto) => {
        const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/polls/${pollId}/react`, {
            method: "POST",
            body: JSON.stringify(dto),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Error al reaccionar a la encuesta');
        }
        return response.json();
    },

    // Dar Like o Dislike a un comentario
    reactToComment: async (commentId: string, dto: ReactDto) => {
        const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/polls/comments/${commentId}/react`, {
            method: "POST",
            body: JSON.stringify(dto),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Error al reaccionar al comentario');
        }
        return response.json();
    },

    // Obtener cuántas encuestas tiene pendientes de cobrar
    getPendingRewards: async (): Promise<{ count: number; potentialCoins: number }> => {
        const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/polls/rewards/pending`);
        if (!response.ok) {
            throw new Error(`Error al traer recompensas pendientes: ${response.status}`);
        }
        return response.json();
    },

    // Reclamar todas las recompensas juntas
    claimAllRewards: async () => {
        const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/polls/rewards/claim-all`, {
            method: 'POST',
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Error al reclamar recompensas');
        }
        return response.json();
    },

    // --- ADMINISTRACIÓN ---

    // Obtener propuestas de usuarios pendientes de moderación
    getPendingPolls: async (): Promise<Poll[]> => {
        const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/polls/pending`);
        if (!response.ok) {
            throw new Error(`Error de privilegios al traer pendientes: ${response.status}`);
        }
        return response.json();
    },

    // Crear una encuesta directa desde cero (Solo ADMIN)
    createPoll: async (dto: {
        title: string;
        description?: string;
        options: { id: number; label: string }[];
        startsAt: string;
        endsAt: string;
        icon: string;
    }): Promise<Poll> => {
        const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/polls`, {
            method: "POST",
            body: JSON.stringify(dto),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Error al crear la encuesta: ${response.status}`);
        }
        return response.json();
    },

    // Aprobar y activar encuesta agendando fechas
    approvePoll: async (pollId: string, dto: ApprovePollDto): Promise<Poll> => {
        const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/polls/${pollId}/approve`, {
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
        const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/polls/${pollId}/reject`, {
            method: "PATCH",
        });
        if (!response.ok) {
            throw new Error(`Error al rechazar encuesta: ${response.status}`);
        }
        return response.json();
    },

    // Cierre manual anticipado de encuesta activa
    closePollManually: async (pollId: string): Promise<{ message: string; pollId: string; status: string }> => {
        const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/polls/${pollId}/close`, {
            method: "PATCH",
        });
        if (!response.ok) {
            throw new Error(`Error al cerrar la encuesta: ${response.status}`);
        }
        return response.json();
    },
};