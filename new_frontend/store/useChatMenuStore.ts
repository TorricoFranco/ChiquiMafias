"use client";

import { create } from 'zustand';

// El menú de opciones de un mensaje: solo uno abierto a la vez, en cualquier chat.
interface ChatMenuState {
    openMenuId: string | null;
    setOpenMenuId: (id: string | null) => void;
}

export const useChatMenuStore = create<ChatMenuState>()((set) => ({
    openMenuId: null,
    setOpenMenuId: (id) => set({ openMenuId: id }),
}));
