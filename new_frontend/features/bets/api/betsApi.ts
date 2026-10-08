import { apiFetch } from "@/lib/apiFetch";
import { BetHistoryItem, AdminMarket, Market, CreateMarketPayload } from "../types";

export const betsApi = {
    /**
     * Obtiene todos los mercados activos para el Dashboard
     */
    getActiveMarkets: async (): Promise<Market[]> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/bets/markets`, {
            method: 'GET',
            headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) throw new Error('Error al cargar los mercados de apuestas');

        return res.json();
    },

    /**
     * Envía una nueva apuesta al backend
     */
    placeBet: async (marketId: string, optionId: string, stake: number) => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/bets/place`, {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ marketId, optionId, stake }),
        });

        if (!res.ok) {
            const errorData = await res.json();
            const errorMessage = Array.isArray(errorData.message)
                ? errorData.message[0]
                : errorData.message;
            throw new Error(errorMessage || 'Error al procesar la apuesta');
        }

        return res.json();
    },



    /**
     * Obtiene el historial de apuestas del usuario conectado
     */
    getMyHistory: async (): Promise<BetHistoryItem[]> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/bets/my-history`, {
            method: 'GET',
            headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) throw new Error('Error al cargar el historial de apuestas');
        return res.json();
    },


    /**
      * RUTA DE ADMIN: Crea un mercado manual
      */
    createManualMarket: async (marketData: CreateMarketPayload): Promise<AdminMarket> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/bets/admin/markets`, {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(marketData),
        });

        if (!res.ok) {
            const errorData = await res.json();
            console.log(errorData);
            throw new Error(errorData.message || 'Error al crear el mercado manual');
        }
        return res.json();
    },

    /**
     * RUTA DE ADMIN: Resuelve un mercado
     */
    settleMarket: async (
        marketId: string,
        settleData: { status: 'SETTLED' | 'REFUNDED'; winningOptionId?: string }
    ): Promise<AdminMarket> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/bets/admin/markets/${marketId}/settle`, {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(settleData),
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || 'Error al liquidar el mercado');
        }
        return res.json();
    },
};