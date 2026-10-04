import { apiFetch } from "@/lib/apiFetch";
import { AdminAddCoinsParams } from "../types";


export const walletApi = {
    /**
     * Obtiene el saldo del usuario autenticado
     */
    getMyBalance: async (): Promise<number> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/wallet/my-balance`, {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
            throw new Error('Error al cargar el saldo de la billetera');
        }

        return res.json();
    },

    /**
   * Permite al presidente acreditar monedas a un usuario
   */
    adminAddCoins: async (payload: AdminAddCoinsParams): Promise<any> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/wallet/admin/add-coins`, {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.message || 'Error al recargar saldo');
        }

        return res.json();
    },
};