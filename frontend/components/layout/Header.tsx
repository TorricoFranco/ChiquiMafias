// src/components/header/Header.tsx
"use client";
import { useEffect, useState } from "react";
import { useUserStore } from "@/store/useUserStore";

// Subcomponentes modulares
import StreakWidget from "../header/StreakWidget";
import UserMenuDropdown from "../header/UserMenuDropdown";
import HeaderNavigation from "../header/HeaderNavigation";

// Modales Compartidos
import LoginModal from "../auth/LoginModal";
import ProfileModal from "../profile/ProfileModal";
import NotificationBell from "../notifications/NotificationBell";
import UserBalance from "../wallet/UserBalance";
import StoreModal from "../store/StoreModal";
import CustomizerModal from "../profile/CustomizerModal";
import StreakModal from "../streak/StrakeModal";

export default function Header() {
  const [isClient, setIsClient] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Triggers de Modales
  const [showLogin, setShowLogin] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showStore, setShowStore] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [showStreak, setShowStreak] = useState(false);

  // Zustand Store Selectors
  const username = useUserStore((state) => state.username);
  const team = useUserStore((state) => state.team);
  const tier = useUserStore((state) => state.tier);
  const logout = useUserStore((state) => state.logout);

  const currentStreak = useUserStore((state) => state.currentStreak);
  const streakRewardClaimed = useUserStore((state) => state.streakRewardClaimed);
  const openStreakModalOnMount = useUserStore((state) => state.openStreakModalOnMount);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && openStreakModalOnMount) {
      const timer = setTimeout(() => {
        setShowStreak(true);
        useUserStore.setState({ openStreakModalOnMount: false });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [openStreakModalOnMount, isClient]);

  if (!isClient) return null;

  return (
    <>
      <header className="flex justify-between items-center p-4 bg-[#181818]/90 backdrop-blur-md border-b border-[#2b2b2b] fixed w-full z-40 top-0 h-16">
        {/* LOGO */}
        <a href="/" className="flex items-center space-x-3 group">
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#1a1a1a] leading-[0]">
            <img
              src="/logo.png"
              alt="Logo Chiqui Mafias"
              className="w-full h-full object-cover shadow-2xl"
            />
          </div>
          <span className="text-xl font-bold text-white tracking-wider group-hover:text-sky-400 transition-colors">
            Chiqui Mafias
          </span>
        </a>

        {/* NAVEGACIÓN COMPONETIZADA */}
        <HeaderNavigation
          onOpenStore={() => setShowStore(true)}
          isUserLoggedIn={!!username}
        />

        {/* SECCIÓN CONTROL USUARIO */}
        <div className="relative flex items-center space-x-3">
          {username && (
            <>
              {/* STREAK WIDGET COMPONETIZADO */}
              <StreakWidget
                currentStreak={currentStreak}
                streakRewardClaimed={streakRewardClaimed}
                onClick={() => setShowStreak(true)}
              />
              <UserBalance />
              <NotificationBell />
            </>
          )}

          {!username ? (
            <button
              onClick={() => setShowLogin(true)}
              className="bg-white text-black px-4 py-1.5 rounded-full font-semibold text-sm hover:bg-gray-200 transition"
            >
              Iniciar Sesión
            </button>
          ) : (
            /* DROPDOWN DINÁMICO COMPONETIZADO */
            <UserMenuDropdown
              username={username}
              team={team}
              tier={tier}
              isOpen={isDropdownOpen}
              setIsOpen={setIsDropdownOpen}
              onLogout={logout}
              onOpenProfile={() => setShowProfile(true)}
              onOpenStore={() => setShowStore(true)}
              onOpenCustomizer={() => setShowCustomizer(true)}
              onOpenSupport={() => console.log("Soporte aún no implementado")}
            />
          )}
        </div>
      </header>

      {/* MODALES GLOBALES */}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} onSuccess={() => setShowLogin(false)} />}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      {showStore && <StoreModal onClose={() => setShowStore(false)} />}
      {showCustomizer && <CustomizerModal onClose={() => setShowCustomizer(false)} />}
      {showStreak && <StreakModal onClose={() => setShowStreak(false)} />}
    </>
  );
}