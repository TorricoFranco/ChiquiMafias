import { apiFetch } from "@/lib/apiFetch";

export interface MarketOption {
    id: string;
    name: string;
    initialProb: number;
    totalStaked: number;
}

export interface Market {
    id: string;
    title: string;
    status: 'OPEN' | 'LOCKED' | 'SETTLED' | 'REFUNDED';
    closesAt: string;
    isManual: boolean;
    options: MarketOption[];
}

export interface BetHistoryItem {
    id: string;
    stake: number;
    status: 'PENDING' | 'WON' | 'LOST' | 'REFUNDED';
    createdAt: string;
    option: {
        name: string;
        market: {
            title: string;
            status: string;
            closesAt: string;
        };
    };
}

export const betsApi = {
    /**
     * Obtiene todos los mercados activos para el Dashboard
     * Nota: Asegurate de tener este GET /bets en tu NestJS controller para listar los mercados.
     */
    getMarkets: async (): Promise<Market[]> => {

        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/bets/markets`, {
            method: 'GET',
            headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) throw new Error('Error al cargar los mercados de apuestas');
        return res.json();
    },

    /**
     * Envía una nueva apuesta al backend (POST /bets/place)
     */
    placeBet: async (marketId: string, optionId: string, stake: number) => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/bets/place`, {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            // Ahora enviamos los 3 campos que requiere el DTO
            body: JSON.stringify({ marketId, optionId, stake }),
        });

        if (!res.ok) {
            const errorData = await res.json();
            // Si el backend envía un array de errores, tomamos el primero
            const errorMessage = Array.isArray(errorData.message)
                ? errorData.message[0]
                : errorData.message;
            throw new Error(errorMessage || 'Error al procesar la apuesta');
        }

        return res.json();
    },



    /**
     * Obtiene el historial de apuestas del usuario conectado (GET /bets/my-history)
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
     * RUTA DE ADMIN: Crea un mercado manual (POST /bets/admin/markets)
     */
    createManualMarket: async (marketData: {
        title: string;
        closesAt: string;
        options: { name: string; initialProb: number }[]
    }): Promise<Market> => {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/bets/admin/markets`, {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(marketData),
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || 'Error al crear el mercado manual');
        }
        return res.json();
    },

    /**
     * RUTA DE ADMIN: Resuelve un mercado (POST /bets/admin/markets/:id/settle)
     */
    settleMarket: async (
        marketId: string,
        settleData: { status: 'SETTLED' | 'REFUNDED'; winningOptionId?: string }
    ): Promise<Market> => {
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