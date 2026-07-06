"use client";

import { useEffect, useState } from "react";
import { useUserStore } from "@/store/useUserStore";
import { streakApi } from "@/services/streakApi";
import { usePathname, useRouter } from "next/navigation";
import BannedScreen from "@/components/auth/BannedScreen";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUserInfo = useUserStore((state) => state.setUserInfo);
  const setStreakInfo = useUserStore((state) => state.setStreakInfo);
  const logout = useUserStore((state) => state.logout);

  const isBanned = useUserStore((state) => state.isBanned);
  const setIsBanned = useUserStore((state) => state.setIsBanned);

  const [loading, setLoading] = useState(true);

  const pathname = usePathname(); // Obtenemos la ruta actual
  const router = useRouter();

  useEffect(() => {
    async function restoreSession() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });

        // 2. Si el backend nos rebota con un 403 (Forbidden)
        if (res.status === 403) {
          const errorData = await res.json();
          // Validamos si viene con nuestro código de control de NestJS
          if (errorData.code === "USER_BANNED") {
            setIsBanned(true);
            setLoading(false);
            return; // Cortamos la ejecución acá
          }
        }

        if (res.ok) {
          const data = await res.json();

          setUserInfo({
            id: data.user.id,
            name: data.user.name,
            username: data.user.username,
            role: data.user.role,
            isFirstLogin: data.user.isFirstLogin,
            tier: data.user.tier,
            accessToken: data.accessToken,
            team: data.user.team,
          });

          if (data.user.balance !== undefined) {
            useUserStore.getState().setBalance(data.user.balance);
          }

          try {
            const streakData = await streakApi.checkIn();
            setStreakInfo(streakData.currentStreak, !streakData.canClaimReward);

            if (streakData.canClaimReward) {
              useUserStore.setState({ openStreakModalOnMount: true });
            }
          } catch (streakError) {
            console.error("Error silencioso al procesar la racha:", streakError);
          }

        } else {
          await logout();
        }
      } catch (error) {
        console.error("Error al restaurar sesión:", error);
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


  return <>{children}</>;
}