import { apiFetch } from "@/lib/apiFetch";
import {
    SubscriptionDetailResponse,
    CheckoutSubscriptionResponse,
    UpgradeSubscriptionResponse,
    CancelSubscriptionResponse,
    SubscriptionTier,
} from "../types/index";

export const subscriptionApi = {
    /**
     * Obtiene la grilla informativa de planes con precios dinámicos
     * GET /subscriptions/plans
     */
    getPlans: async (userTier: SubscriptionTier | null): Promise<any> => {
        const url = userTier
            ? `${process.env.NEXT_PUBLIC_API_URL}/subscriptions/plans?tier=${userTier}`
            : `${process.env.NEXT_PUBLIC_API_URL}/subscriptions/plans`;

        const res = await apiFetch(url, { method: 'GET' });
        if (!res.ok) throw new Error('Error al obtener la grilla de planes');
        return res.json();
    },

    /**
     * Obtiene los detalles de la suscripción actual del usuario autenticado
     * GET /subscriptions/me
     */
    getCurrent: async (): Promise<SubscriptionDetailResponse | null> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/subscriptions/me`, {
            method: 'GET',
        });
        if (!res.ok) throw new Error('Error al obtener la suscripción actual');
        return res.json();
    },

    /**
     * Inicia el flujo de alta/checkout para un plan nuevo
     * POST /subscriptions/checkout
     */
    startCheckout: async (tier: SubscriptionTier): Promise<CheckoutSubscriptionResponse> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/subscriptions/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tier }),
        });
        if (!res.ok) throw new Error(`Error al iniciar checkout para el tier ${tier}`);
        return res.json();
    },

    /**
     * Solicita el upgrade seguro hacia un tier superior
     * POST /subscriptions/upgrade 
     */
    upgrade: async (newTier: SubscriptionTier): Promise<UpgradeSubscriptionResponse> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/subscriptions/upgrade`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newTier }),
        });
        if (!res.ok) throw new Error(`Error al solicitar el upgrade al tier ${newTier}`);
        return res.json();
    },

    /**
     * Cancela la renovación automática del plan actual
     * POST /subscriptions/cancel
     */
    cancel: async (reason?: string): Promise<CancelSubscriptionResponse> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/subscriptions/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason }),
        });
        if (!res.ok) throw new Error('Error al cancelar la suscripción');
        return res.json();
    },
};