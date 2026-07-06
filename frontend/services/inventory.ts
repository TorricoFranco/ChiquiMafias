// src/services/inventory.service.ts
import { apiFetch } from "@/lib/apiFetch";

export type EquipableType = 'NAME_COLOR' | 'BANNER';

export interface InventoryItem {
    id: string;
    itemId: string;
    quantity: number;
    isEquipped: boolean;
    createdAt: string;
    item: {
        id: string;
        name: string;
        description: string;
        type: EquipableType | string;
        assetId: string;
    };
}

interface EquipResponse {
    status: 'ok';
    equipped: EquipableType;
}

interface UnequipResponse {
    status: 'ok';
    unequip: EquipableType;
}

export const inventoryApi = {
    /**
     * Trae todos los artículos comprados que pertenecen al usuario autenticado.
     */
    getUserInventory: async (): Promise<InventoryItem[]> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/inventory`, {
            method: 'GET',
            headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
            throw new Error('Error al cargar el inventario del usuario');
        }

        return res.json();
    },

    /**
     * Equipa un cosmético permanente (NAME_COLOR o BANNER).
     * Actualiza PostgreSQL y actualiza la caché permanente de Redis para el Chat.
     */
    equipItem: async (itemId: string): Promise<EquipResponse> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/inventory/equip/${itemId}`, {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || 'Error al equipar el artículo cosmético');
        }

        return res.json();
    },

    /**
     * Remueve el cosmético activo volviendo al estado por defecto (null).
     * Elimina la clave del usuario en Redis para limpiar el diseño en el chat en tiempo real.
     */
    unequipItem: async (type: EquipableType): Promise<UnequipResponse> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/inventory/unequip/${type}`, {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || 'Error al desequipar el artículo cosmético');
        }

        return res.json();
    },

    consumeItem: async (type: 'MEGAPHONE'): Promise<{ status: string; remaining: number }> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/inventory/consume/${type}`, {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || 'Error al consumir el artículo');
        }

        return res.json();
    }
};