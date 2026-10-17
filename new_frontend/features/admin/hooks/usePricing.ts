import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pricingApi } from '../api/pricingApi';

export const PRICING_QUERY_KEY = ['admin-pricing'];

export const usePricingOverview = (enabled = true) => {
    return useQuery({
        queryKey: PRICING_QUERY_KEY,
        queryFn: pricingApi.getOverview,
        enabled,
    });
};

/** Invalida el panel y la vista de usuario donde se muestra ese precio. */
const useInvalidateAfterPriceChange = (publicKey: string) => {
    const queryClient = useQueryClient();

    return () => {
        queryClient.invalidateQueries({ queryKey: PRICING_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: [publicKey] });
    };
};

// `onSettled`, no `onSuccess`: ante un 409 ("otro cambio se aplicó primero") el
// panel tiene que traer el precio que quedó, que es justo lo que pide el mensaje.
export const useUpdateCoinPackPrice = () => {
    const invalidate = useInvalidateAfterPriceChange('coin-packs');

    return useMutation({
        mutationFn: pricingApi.updateCoinPackPrice,
        onSettled: invalidate,
    });
};

export const useUpdateStoreItemPrice = () => {
    const invalidate = useInvalidateAfterPriceChange('store-items');

    return useMutation({
        mutationFn: pricingApi.updateStoreItemPrice,
        onSettled: invalidate,
    });
};

export const useUpdateSubscriptionPlanPrice = () => {
    const invalidate = useInvalidateAfterPriceChange('subscription-plans');

    return useMutation({
        mutationFn: pricingApi.updateSubscriptionPlanPrice,
        onSettled: invalidate,
    });
};
