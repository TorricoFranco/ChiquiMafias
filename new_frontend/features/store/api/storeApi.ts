import { apiFetch } from "@/lib/apiFetch";
import { StoreItem, BuyItemResponse } from "../types";

export const storeApi = {
    /**
     * Obtiene todos los artículos activos de la tienda.
     */
    getStoreItems: async (): Promise<StoreItem[]> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/store`, {
            method: 'GET',
            headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
            throw new Error('Error al cargar los artículos de la tienda');
        }

        const data = await res.json();
        return data;
    },

    /**
     * Realiza la compra segura de un artículo usando monedas del balance.
     * El backend restará el saldo y actualizará el inventario en una transacción.
     */
    buyItem: async (itemId: string, quantity: number = 1): Promise<any> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/store/buy/${itemId}`, {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quantity })
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || 'Error al procesar la compra del artículo');
        }

        return res.json();
    }
};