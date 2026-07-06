"use client";

import { create } from 'zustand';
import { UserState } from '@/types/user';

export const useUserStore = create<UserState>()(
  (set) => ({
    id: null,
    name: null,
    username: null,
    team: null,
    role: null,
    tier: 'NONE',
    isFirstLogin: true,
    accessToken: null,
    balance: 0,
    isBanned: false,

    currentStreak: 0,
    streakRewardClaimed: true,
    openStreakModalOnMount: false,

    setUserInfo: (info) => set((state) => ({ ...state, ...info })),

    setIsBanned: (value) => set({ isBanned: value }),

    setBalance: (balance) => set({ balance }),

    setStreakInfo: (currentStreak, streakRewardClaimed) =>
      set({ currentStreak, streakRewardClaimed }),

    updateAfterClaim: (newBalance, newStreak) =>
      set({ balance: newBalance, currentStreak: newStreak, streakRewardClaimed: true }),

    logout: async (socketDisconnectFn) => {
      try {
        if (socketDisconnectFn) {
          socketDisconnectFn();
        }

        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {
          method: "POST",
          credentials: "include",
        });
      } catch (error) {
        console.error("Error al notificar logout al servidor:", error);
      } finally {
        set({
          id: null,
          name: null,
          username: null,
          team: null,
          role: null,
          tier: 'NONE',
          isFirstLogin: true,
          accessToken: null,
          balance: 0,
          currentStreak: 0,
          streakRewardClaimed: true,
        });
      }
    },
  })
);