import { apiFetch } from '@/lib/apiFetch';
import {
    PricingEnvelope,
    PricingOverview,
    UpdateCoinPackPriceResult,
    UpdateStoreItemPriceResult,
    UpdateSubscriptionPlanPriceResult,
} from '../types';

const BASE = `${process.env.NEXT_PUBLIC_API_URL}/pricing`;

const parseError = async (res: Response, fallback: string): Promise<never> => {
    const errorData = await res.json().catch(() => ({}));
    // El ValidationPipe de Nest devuelve `message` como array de mensajes.
    const message: unknown = errorData.message;
    throw new Error(
        (Array.isArray(message) ? message.join('. ') : message as string) || fallback,
    );
};

export const pricingApi = {

    getOverview: async (): Promise<PricingOverview> => {
        const res = await apiFetch(`${BASE}/admin`);
        if (!res.ok) throw new Error('Error al obtener los precios vigentes');
        const json: PricingEnvelope<PricingOverview> = await res.json();
        return json.data;
    },

    updateCoinPackPrice: async (data: { id: string; priceARS: number }): Promise<PricingEnvelope<UpdateCoinPackPriceResult>> => {
        const res = await apiFetch(`${BASE}/coin-packs/${data.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ priceARS: data.priceARS }),
        });
        if (!res.ok) return parseError(res, 'No se pudo actualizar el precio del pack');
        return res.json();
    },

    updateStoreItemPrice: async (data: { id: string; price: number }): Promise<PricingEnvelope<UpdateStoreItemPriceResult>> => {
        const res = await apiFetch(`${BASE}/store-items/${data.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ price: data.price }),
        });
        if (!res.ok) return parseError(res, 'No se pudo actualizar el precio del ítem');
        return res.json();
    },

    updateSubscriptionPlanPrice: async (data: { id: string; basePriceARS: number }): Promise<PricingEnvelope<UpdateSubscriptionPlanPriceResult>> => {
        const res = await apiFetch(`${BASE}/subscription-plans/${data.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ basePriceARS: data.basePriceARS }),
        });
        if (!res.ok) return parseError(res, 'No se pudo actualizar el precio del plan');
        return res.json();
    },
};
