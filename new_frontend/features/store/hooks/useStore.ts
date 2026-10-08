import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storeApi } from '@/features/store/api/storeApi';

export const useStoreItems = () => {
    return useQuery({
        queryKey: ['store-items'],
        queryFn: storeApi.getStoreItems,
        select: (data) => {
            return {
                all: data,
                stickers: data.filter((item) => item.type === 'STICKER_PACK'),
                banners: data.filter((item) => item.type === 'BANNER'),
                chatBubbles: data.filter((item) => item.type === 'CHAT_BUBBLE'),
                nameColors: data.filter((item) => item.type === 'NAME_COLOR'),
                megaphones: data.filter((item) => item.type === 'MEGAPHONE'),
                customPolls: data.filter((item) => item.type === 'CUSTOM_POLL'),
            };
        }
    });
};

export const useBuyItem = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ itemId, price, quantity = 1 }: { itemId: string; price: number; quantity?: number }) =>
            storeApi.buyItem(itemId, quantity),

        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['store-items'] });
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
        },
    });
};