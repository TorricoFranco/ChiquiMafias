"use client";

import { create } from 'zustand';
import { UserState } from '@/types/user';
import Cookies from "js-cookie";
import { authApi } from "@/features/auth/api/authApi";
import { SubscriptionTier } from '@/features/subscriptions/types';

export const useUserStore = create<UserState>()(
    (set) => ({
        id: null,
        name: null,
        username: null,
        team: null,
        role: null,
        tier: SubscriptionTier.NONE,
        isFirstLogin: true,
        termsAcceptedAt: null,
        termsVersion: null,
        accessToken: null,
        balance: 0,
        isBanned: false,
        activeNameColorId: null,
        activeBannerId: null,
        activeChatBubbleId: null,

        isStreakModalOpen: false,
        setIsStreakModalOpen: (isOpen: boolean) => set({ isStreakModalOpen: isOpen }),

        isLoginModalOpen: false,
        setLoginModalOpen: (isOpen) => set({ isLoginModalOpen: isOpen }),

        currentStreak: 0,
        streakRewardClaimed: true,

        setUserInfo: (info) => set((state) => ({ ...state, ...info })),
        setIsBanned: (value) => set({ isBanned: value }),
        setBalance: (balance) => set({ balance }),
        setStreak: (currentStreak) => set({ currentStreak }),
        setStreakInfo: (currentStreak, streakRewardClaimed) =>
            set({ currentStreak, streakRewardClaimed }),

        updateAfterClaim: (newBalance, newStreak) =>
            set({ balance: newBalance, currentStreak: newStreak, streakRewardClaimed: true }),

        setEquippedItem: (type, itemId) => set((state) => {
            if (type === 'NAME_COLOR') return { activeNameColorId: itemId };
            if (type === 'BANNER') return { activeBannerId: itemId };
            if (type === 'CHAT_BUBBLE') return { activeChatBubbleId: itemId };
            return state;
        }),

        updateCosmetic: (key, value) => set((state) => ({
            ...state,
            [key]: value
        })),

        logout: async (socketDisconnectFn) => {
            try {
                if (socketDisconnectFn) {
                    socketDisconnectFn();
                }

                await authApi.logout();

            } catch (error) {
                console.error("Error al notificar logout al servidor:", error);
            } finally {
                Cookies.remove('accessToken');

                set({
                    id: null,
                    name: null,
                    username: null,
                    team: null,
                    role: null,
                    tier: 'NONE',
                    isFirstLogin: true,
                    termsAcceptedAt: null,
                    termsVersion: null,
                    accessToken: null,
                    balance: 0,
                    currentStreak: 0,
                    streakRewardClaimed: true,
                    isBanned: false,
                    isLoginModalOpen: false,
                    isStreakModalOpen: false,
                    activeNameColorId: null,
                    activeBannerId: null,
                    activeChatBubbleId: null,
                });
            }
        },
    })
);