import { apiFetch } from "@/lib/apiFetch";

import { StoreItem } from "@/types/store";

export const storeApi = {
    /**
     * Obtiene todos los artículos activos de la tienda.
     * Si el usuario está logueado, el backend interceptará el token 
     * y rellenará los campos `isOwned` y `ownedQuantity`.
     */
    getStoreItems: async (): Promise<StoreItem[]> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/store`, {
            method: 'GET',
            headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
            throw new Error('Error al cargar los artículos de la tienda');
        }
        
        return res.json();
    },

    /**
     * Realiza la compra segura de un artículo usando monedas del balance.
     * El backend restará el saldo y actualizará el inventario en una transacción.
     */
    buyItem: async (itemId: string): Promise<{ success: boolean; message?: string }> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/store/buy/${itemId}`, {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || 'Error al procesar la compra del artículo');
        }

        return res.json();
    }
};