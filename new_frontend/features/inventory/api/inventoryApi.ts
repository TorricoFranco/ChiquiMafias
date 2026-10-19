import { apiFetch } from "@/lib/apiFetch";
import { InventoryItem, EquipResponse, UnequipResponse, ConsumeResponse, EquipableType } from "../types";

export const inventoryApi = {
    /**
     * Trae todos los artículos comprados que pertenecen al usuario autenticado.
     */
    getUserInventory: async (): Promise<InventoryItem[]> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/inventory`);

        if (!res.ok) throw new Error('Error al cargar el inventario del usuario');
        return res.json();
    },

    /**
     * Equipa un cosmético permanente (NAME_COLOR o BANNER, CHAT_BUBBLE).
     */
    equipItem: async (itemId: string): Promise<EquipResponse> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/inventory/equip/${itemId}`, {
            method: 'POST',
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || 'Error al equipar el artículo cosmético');
        }
        return res.json();
    },

    /**
     * Remueve el cosmético activo volviendo al estado por defecto (null).
     */
    unequipItem: async (type: EquipableType): Promise<UnequipResponse> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/inventory/unequip/${type}`, {
            method: 'POST',
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || 'Error al desequipar el artículo cosmético');
        }
        return res.json();
    },

    consumeItem: async (type: 'MEGAPHONE' | 'CUSTOM_POLL'): Promise<ConsumeResponse> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/inventory/consume/${type}`, {
            method: 'POST',
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || 'Error al consumir el artículo');
        }
        return res.json();
    }
};