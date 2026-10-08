"use client";

import { useEffect, useState } from "react";
import { useUserStore } from "@/store/useUserStore";
import { streakApi } from "@/features/streak/api/streakApi";
import { refreshSession } from "@/lib/apiFetch";
import BannedAppealScreen from "@/features/supports/components/appeal/BannedAppealScreen";
import Cookies from "js-cookie";
import LoginModal from "@/features/auth/components/LoginModal";
import TermsGate from "@/features/auth/components/TermsGate";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    const setUserInfo = useUserStore((state) => state.setUserInfo);
    const setStreakInfo = useUserStore((state) => state.setStreakInfo);
    const logout = useUserStore((state) => state.logout);

    const isBanned = useUserStore((state) => state.isBanned);
    const setIsBanned = useUserStore((state) => state.setIsBanned);

    const isLoginModalOpen = useUserStore((state) => state.isLoginModalOpen);
    const setLoginModalOpen = useUserStore((state) => state.setLoginModalOpen);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function restoreSession() {
            try {
                // Pasa por el lock compartido: otra pestaña puede estar rotando el refresh token ahora mismo.
                const { ok, status, data } = await refreshSession();

                if (status === 403 && data?.code === "USER_BANNED") {
                    setIsBanned(true);
                    setLoading(false);
                    return;
                }

                if (ok) {
                    Cookies.set("accessToken", data.access_token, {
                        secure: process.env.NODE_ENV === "production",
                        sameSite: "lax",
                        expires: 7
                    });

                    setUserInfo({
                        id: data.user.id,
                        name: data.user.name,
                        username: data.user.username,
                        role: data.user.role,
                        isFirstLogin: data.user.isFirstLogin,
                        termsAcceptedAt: data.user.termsAcceptedAt ?? null,
                        termsVersion: data.user.termsVersion ?? null,
                        tier: data.user.activeSubscriptionTier || 'NONE',
                        accessToken: data.access_token,
                        team: data.user.team,
                        activeNameColorId: data.user.activeNameColorId || null,
                        activeChatBubbleId: data.user.activeChatBubbleId || null,
                        activeBannerId: data.user.activeBannerId || null,
                    });

                    // El refresh no rechaza a un usuario baneado: conserva el token para poder apelar.
                    if (data.user.status === "BANNED") {
                        setIsBanned(true);
                        return;
                    }

                    if (data.user.balance !== undefined) {
                        useUserStore.getState().setBalance(data.user.balance);
                    }

                    try {
                        const streakData = await streakApi.checkIn();
                        setStreakInfo(streakData.currentStreak, !streakData.canClaimReward);

                        if (streakData.canClaimReward) {
                            useUserStore.getState().setIsStreakModalOpen(true);
                        }
                    } catch (streakError) {
                        console.error("Error silencioso al procesar la racha:", streakError);
                    }

                } else {
                    await logout();
                }
            } catch (error) {
                console.error("Error al restaurar sesión:");
                await logout();
            } finally {
                setLoading(false);
            }
        }

        restoreSession();
    }, [setUserInfo, setStreakInfo, logout, setIsBanned]);

    if (loading) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-[#121212] text-white">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-sky-500"></div>
            </div>
        );
    }

    if (isBanned) {
        return <BannedAppealScreen />;
    }


    return (
        <>
            {children}

            <TermsGate />

            {isLoginModalOpen && (
                <LoginModal
                    onClose={() => setLoginModalOpen(false)}
                    onSuccess={() => setLoginModalOpen(false)}
                />
            )}
        </>
    );
}