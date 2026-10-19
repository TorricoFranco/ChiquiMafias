import { apiFetch } from "@/lib/apiFetch";
import { CoinPack, BuyPackResponse, CoinOrder } from "../types";

export const coinShopApi = {
    /**
     * Obtiene el catálogo de packs activos
     */
    getPacks: async (): Promise<CoinPack[]> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/coin-shop/packs`, {
            method: 'GET'
        });
        if (!res.ok) throw new Error('Error al obtener los packs de monedas');
        return res.json();
    },

    /**
     * Inicia la compra de un pack y devuelve la URL de Mercado Pago
     */
    buyPack: async (packId: string): Promise<BuyPackResponse> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/coin-shop/buy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ packId }),
        });

        if (!res.ok) {
            // Leer el cuerpo del error que manda NestJS
            const errorData = await res.json().catch(() => null);
            console.error('Error detallado del backend:', errorData);
            throw new Error(errorData?.message || 'Error al iniciar la compra del pack');
        }

        return res.json();
    },

    /**
     * Obtiene el historial de compras de monedas del usuario
     */
    getMyOrders: async (): Promise<CoinOrder[]> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/coin-shop/my-orders`, {
            method: 'GET'
        });
        if (!res.ok) throw new Error('Error al obtener el historial de compras');
        return res.json();
    }
};