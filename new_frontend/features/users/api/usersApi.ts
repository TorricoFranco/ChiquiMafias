import { apiFetch } from '@/lib/apiFetch';
import { SystemRole, ChatClient, MutedUser, PaginatedUsersResponse, AdminStatsResponse } from '../types';

export const adminUsersApi = {


    getUsers: async (page = 1, limit = 10): Promise<PaginatedUsersResponse> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/users?page=${page}&limit=${limit}`);
        if (!res.ok) throw new Error('Error al obtener usuarios');
        return res.json();
    },

    getOnlineUsers: async (): Promise<ChatClient[]> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/users/online`);
        if (!res.ok) throw new Error('Error al obtener usuarios online');
        return res.json();
    },

    getMutedUsers: async (): Promise<MutedUser[]> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/moderation/muted-users`);
        if (!res.ok) throw new Error('Error al obtener usuarios silenciados');
        return res.json();
    },


    banUser: async (userId: string): Promise<void> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${userId}/ban`, { method: 'PATCH' });
        if (!res.ok) throw new Error('Error al banear usuario');
    },

    unbanUser: async (userId: string): Promise<void> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${userId}/unban`, { method: 'PATCH' });
        if (!res.ok) throw new Error('Error al desbanear usuario');
    },

    updateRole: async (data: { userId: string; role: SystemRole }): Promise<void> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${data.userId}/role`, {
            method: 'PATCH',
            body: JSON.stringify({ role: data.role }),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.message || 'Error al actualizar rol');
        }
    },

    timeoutUser: async (data: { userId: string; durationMinutes: number }): Promise<void> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/moderation/timeout`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Error al silenciar usuario');
    },

    unmuteUser: async (userId: string): Promise<void> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/moderation/unmute`, {
            method: 'POST',
            body: JSON.stringify({ userId }),
        });
        if (!res.ok) throw new Error('Error al desmutear usuario');
    },


    getStats: async (): Promise<AdminStatsResponse> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/moderation/stats`);
        if (!res.ok) throw new Error('Error al obtener estadísticas del admin');
        return res.json();
    }
};