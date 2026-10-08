import { create } from 'zustand';

export interface TicketItem {
    id: string; 
    marketId: string; 
    optionId: string; 
    matchTitle: string; 
    selectionLabel: string; 
    odds: number;
    betAmount: number;
}

interface TicketState {
    ticketItems: TicketItem[];
    addItem: (item: Omit<TicketItem, 'id' | 'betAmount'>) => void;
    removeItem: (marketId: string, optionId: string) => void;
    updateAmount: (id: string, amount: number) => void;
    clearTicket: () => void;
}

export const useTicketStore = create<TicketState>((set) => ({
    ticketItems: [],
    
    addItem: (item) => set((state) => {
        const filteredItems = state.ticketItems.filter(
            (i) => i.marketId !== item.marketId
        );

        return {
            ticketItems: [
                ...filteredItems,
                { ...item, id: `${item.marketId}-${item.optionId}`, betAmount: 100 } 
            ]
        };
    }),

    removeItem: (marketId, optionId) => set((state) => ({
        ticketItems: state.ticketItems.filter(
            (i) => !(i.marketId === marketId && i.optionId === optionId)
        )
    })),

    updateAmount: (id, amount) => set((state) => ({
        ticketItems: state.ticketItems.map((item) => 
            item.id === id ? { ...item, betAmount: amount } : item
        )
    })),

    clearTicket: () => set({ ticketItems: [] }),
}));