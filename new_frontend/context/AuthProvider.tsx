"use client";

import { useEffect, useState } from "react";
import { useUserStore } from "@/store/useUserStore";
import { streakApi } from "@/features/streak/api/streakApi";
import { usePathname } from "next/navigation";
import { authApi } from "@/features/auth/api/authApi";
import BannedScreen from "@/features/auth/components/BannedScreen";
import Cookies from "js-cookie";
import LoginModal from "@/features/auth/components/LoginModal";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    const setUserInfo = useUserStore((state) => state.setUserInfo);
    const setStreakInfo = useUserStore((state) => state.setStreakInfo);
    const logout = useUserStore((state) => state.logout);

    const isBanned = useUserStore((state) => state.isBanned);
    const setIsBanned = useUserStore((state) => state.setIsBanned);

    const isLoginModalOpen = useUserStore((state) => state.isLoginModalOpen);
    const setLoginModalOpen = useUserStore((state) => state.setLoginModalOpen);

    const [loading, setLoading] = useState(true);

    const pathname = usePathname();

    useEffect(() => {
        async function restoreSession() {
            try {
                const res = await authApi.refresh();

                if (res.status === 403) {
                    const errorData = await res.json();
                    if (errorData.code === "USER_BANNED") {
                        setIsBanned(true);
                        setLoading(false);
                        return;
                    }
                }

                if (res.ok) {
                    const data = await res.json();

                    console.log("Datos que llegan del Backend en refresh():", data.user);

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
                        tier: data.user.activeSubscriptionTier || 'NONE',
                        accessToken: data.access_token,
                        team: data.user.team,
                        activeNameColorId: data.user.activeNameColorId || null,
                        activeChatBubbleId: data.user.activeChatBubbleId || null,
                        activeBannerId: data.user.activeBannerId || null,
                    });

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

    if (isBanned && !pathname.startsWith('/support')) {
        return <BannedScreen />;
    }


    return (
        <>
            {children}

            {isLoginModalOpen && (
                <LoginModal
                    onClose={() => setLoginModalOpen(false)}
                    onSuccess={() => setLoginModalOpen(false)}
                />
            )}
        </>
    );
}