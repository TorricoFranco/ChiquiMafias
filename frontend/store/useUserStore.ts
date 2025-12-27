"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  id: string | null;
  username: string | null;
  team: string | null;
  isFirstLogin: boolean;
  setUserInfo: (info: Partial<UserState>) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      id: null,
      username: null,
      team: null,
      isFirstLogin: true,

      // Acción para actualizar parte del usuario o todo
      setUserInfo: (info) => set((state) => ({ ...state, ...info })),

      // Acción para limpiar todo
      logout: () => {
        localStorage.removeItem('token'); // El token no lo metemos en persist por seguridad
        set({ id: null, username: null, team: null, isFirstLogin: true });
      },
    }),
    {
      name: 'user-storage', // Nombre de la key en LocalStorage
    }
  )
);