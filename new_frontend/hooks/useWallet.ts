import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminAddCoinsParams } from '../features/wallet/types';
import { walletApi } from '../features/wallet/api/walletApi';

export const useAdminAddCoins = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: AdminAddCoinsParams) => walletApi.adminAddCoins(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        },
    });
};