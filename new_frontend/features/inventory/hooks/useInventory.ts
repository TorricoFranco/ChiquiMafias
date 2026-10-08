import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '../api/inventoryApi';
import { useUserStore } from '@/store/useUserStore';

export const useUserInventory = () => {
    const userId = useUserStore((state) => state.id);
    return useQuery({
        queryKey: ['inventory'],
        queryFn: inventoryApi.getUserInventory,
        enabled: !!userId,
        select: (data) => {
            const items = data ?? [];

            return {
                all: items,
                nameColors: items.filter((inv) => inv.item.type === 'NAME_COLOR'),
                banners: items.filter((inv) => inv.item.type === 'BANNER'),
                chatBubbles: items.filter((inv) => inv.item.type === 'CHAT_BUBBLE'),
                megaphones: items.filter((inv) => inv.item.type === 'MEGAPHONE'),
                stickers: items.filter((inv) => inv.item.type === 'STICKER_PACK'),
                customPolls: items.filter((inv) => inv.item.type === 'CUSTOM_POLL'),
            };
        }
    });
};


export const useEquipItem = () => {
    const queryClient = useQueryClient();
    const updateCosmetic = useUserStore((state) => state.updateCosmetic);

    return useMutation({
        mutationFn: inventoryApi.equipItem,
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });

            if (data.equipped === 'NAME_COLOR') {
                updateCosmetic('activeNameColorId', data.assetId);
            } else if (data.equipped === 'CHAT_BUBBLE') {
                updateCosmetic('activeChatBubbleId', data.assetId);
            } else if (data.equipped === 'BANNER') {
                updateCosmetic('activeBannerId', data.assetId);
            }
        }
    });
};

export const useUnequipItem = () => {
    const queryClient = useQueryClient();
    const updateCosmetic = useUserStore((state) => state.updateCosmetic);

    return useMutation({
        mutationFn: inventoryApi.unequipItem,
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });

            if (variables === 'NAME_COLOR') {
                updateCosmetic('activeNameColorId', null);
            } else if (variables === 'CHAT_BUBBLE') {
                updateCosmetic('activeChatBubbleId', null);
            } else if (variables === 'BANNER') {
                updateCosmetic('activeBannerId', null);
            }
        }
    });
};

export const useConsumeItem = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: inventoryApi.consumeItem,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
        }
    });
};