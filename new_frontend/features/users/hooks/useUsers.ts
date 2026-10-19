import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminUsersApi } from '../api/usersApi';

export const useAdminUsersList = (page: number, limit: number = 10) => {
    return useQuery({
        queryKey: ['admin-users', page, limit],
        queryFn: () => adminUsersApi.getUsers(page, limit),
    });
};

export const useAdminOnlineUsers = () => {
    return useQuery({
        queryKey: ['admin-online-users'],
        queryFn: adminUsersApi.getOnlineUsers,
        refetchInterval: 10000,
    });
};

export const useAdminMutedUsers = () => {
    return useQuery({
        queryKey: ['admin-muted-users'],
        queryFn: adminUsersApi.getMutedUsers,
    });
};



export const useAdminBanUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: adminUsersApi.banUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        },
    });
};

export const useAdminUnbanUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: adminUsersApi.unbanUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        },
    });
};

export const useAdminUpdateRole = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: adminUsersApi.updateRole,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        },
    });
};

export const useAdminTimeoutUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: adminUsersApi.timeoutUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            queryClient.invalidateQueries({ queryKey: ['admin-muted-users'] });
        },
    });
};

export const useAdminUnmuteUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: adminUsersApi.unmuteUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            queryClient.invalidateQueries({ queryKey: ['admin-muted-users'] });
        },
    });
};

export const useAdminStats = () => {
    return useQuery({
        queryKey: ['admin-stats'],
        queryFn: adminUsersApi.getStats,
        refetchInterval: 30000,
        staleTime: 10000,
    });
};