import { useQuery, useMutation } from '@tanstack/react-query';
import { coinShopApi } from '../api/apiCoins-shop';
import { useUserStore } from "@/store/useUserStore";

export const useGetCoinPacks = () => {
    return useQuery({
        queryKey: ['coin-packs'],
        queryFn: coinShopApi.getPacks,
        // Corto a propósito: el presidente cambia los precios en caliente desde el
        // panel y el checkout cobra el precio de la DB, no el que quedó cacheado.
        staleTime: 1000 * 60,
    });
};

export const useGetMyCoinOrders = () => {
    return useQuery({
        queryKey: ['coin-orders', 'me'],
        queryFn: coinShopApi.getMyOrders,
    });
};

export const useBuyCoinPack = () => {
    return useMutation({
        mutationFn: async (packId: string) => {
            const currentBalance = useUserStore.getState().balance;
            if (currentBalance !== null && currentBalance !== undefined) {
                localStorage.setItem('prePurchaseBalance', currentBalance.toString());
            }

            return await coinShopApi.buyPack(packId);
        },
        onSuccess: (data) => {
            const urlToRedirect = data.data.initPoint;
            window.location.href = urlToRedirect;
        },
        onError: () => {
            localStorage.removeItem('prePurchaseBalance');
        }
    });
};