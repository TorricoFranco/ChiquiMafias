"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flame, Bell, Gift, PlusCircle, ChevronDown, Menu, User, Settings } from 'lucide-react';
import { useUserStore } from "@/store/useUserStore";
import { useWallet } from "@/features/wallet/socket/useWalletSocket";
import NotificationBell from '@/features/notifications/components/NotificationBell';
import StreakModal from '@/features/streak/components/StreakModal';
import { useUIStore } from '@/store/useUIStore';
import { AnimatedBalance } from '@/features/wallet/components/AnimatedBalance';
import { MobileMenu } from './MobileMenu';
import { useNavigationStore } from '@/store/useNavigationStore';
import { useHideOnScroll } from '@/hooks/useHideOnScroll';

interface HeaderProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
    activeTab,
    setActiveTab,
}) => {

    const setActiveTabSocial = useNavigationStore((state) => state.setActiveTab)

    const toggleMobileSidebar = useUIStore((state) => state.toggleMobileSidebar)
    const isMobileSidebarOpen = useUIStore((state) => state.isMobileSidebarOpen)
    const [showUserMenu, setShowUserMenu] = useState(false);
    const pathname = usePathname();
    const hiddenOnScroll = useHideOnScroll(`${pathname}|${activeTab}`);
    const isFolded = hiddenOnScroll && !showUserMenu && !isMobileSidebarOpen;

    const id = useUserStore((state) => state.id);
    const isAuthenticated = !!id;
    const username = useUserStore((state) => state.username);
    const currentStreak = useUserStore((state) => state.currentStreak);
    const team = useUserStore((state) => state.team);
    const tier = useUserStore((state) => state.tier);

    const setLoginModalOpen = useUserStore((state) => state.setLoginModalOpen);
    const setIsStreakModalOpen = useUserStore((state) => state.setIsStreakModalOpen);

    const isStreakModalOpen = useUserStore((state) => state.isStreakModalOpen);

    const { balance, loading } = useWallet();

    const displayName = username ?? "Usuario";
    const avatarSrc = team?.badgeUrl ?? null;
    const tierLabel: Record<string, string> = {
        NONE: "HINCHA",
        TIER_1: "POPULAR",
        TIER_2: "PLATEA",
        TIER_3: "PALCO VIP",
    };
    const currentTier = tierLabel[tier] ?? "HINCHA";

    return (
        <>
            {/* Celular: va en el flujo (ocupa su lugar) y se pliega al bajar el scroll; desde md: fixed */}
            <div
                inert={isFolded}
                className={`max-md:grid max-md:transition-[grid-template-rows] max-md:duration-200 md:contents ${isFolded
                    ? 'max-md:grid-rows-[0fr] max-md:overflow-hidden'
                    : 'max-md:grid-rows-[1fr]'
                    }`}
            >
            <header className="max-md:min-h-0 md:fixed md:top-0 md:left-0 w-full z-50 border-b border-[#353534] shadow-md bg-[#131313]/95 backdrop-blur-md">
                <div className="flex justify-between items-center h-16 px-3 sm:px-4 md:px-8 max-w-[1920px] mx-auto">
                    <div className="flex items-center gap-1 sm:gap-4 md:gap-6 min-w-0">
                        <button
                            onClick={toggleMobileSidebar}
                            className="lg:hidden p-1.5 sm:p-2 shrink-0 text-[#c6c9ab] hover:text-[#e5e2e1] focus:outline-none"
                            aria-label="Abrir menú"
                            aria-expanded={isMobileSidebarOpen}
                        >
                            <Menu className="w-6 h-6" />
                        </button>

                        <Link href="/" className="flex items-center gap-2 group">
                            <img
                                src="/logo/chiqui-mafias-logo.png"
                                alt="Chiqui Mafias Logo"
                                className="h-9 sm:h-12 w-auto object-contain transition-transform group-hover:scale-105"
                            />
                        </Link>

                        <nav aria-label="Vistas" className="hidden lg:flex items-center gap-6 ml-2">
                            <button
                                onClick={() => setActiveTab('ligas')}
                                aria-current={activeTab === 'ligas' ? 'page' : undefined}
                                className={`font-semibold text-xs md:text-sm uppercase tracking-wider px-2 py-1 rounded transition-colors ${activeTab === 'ligas'
                                    ? 'text-[#d2f000] border-b-2 border-[#d2f000]'
                                    : 'text-[#c6c9ab] hover:text-[#e5e2e1] hover:bg-[#353534]/50'
                                    }`}
                            >
                                LIGAS
                            </button>
                            <button
                                onClick={() => setActiveTab('calendario')}
                                aria-current={activeTab === 'calendario' ? 'page' : undefined}
                                className={`font-semibold text-xs md:text-sm uppercase tracking-wider px-2 py-1 rounded transition-colors ${activeTab === 'calendario'
                                    ? 'text-[#d2f000] border-b-2 border-[#d2f000]'
                                    : 'text-[#c6c9ab] hover:text-[#e5e2e1] hover:bg-[#353534]/50'
                                    }`}
                            >
                                CALENDARIO
                            </button>
                            <button
                                onClick={() => setActiveTab('social')}
                                aria-current={activeTab === 'social' ? 'page' : undefined}
                                className={`font-semibold text-xs md:text-sm uppercase tracking-wider px-2 py-1 transition-transform ${activeTab === 'social'
                                    ? 'text-[#d2f000] border-b-2 border-[#d2f000] font-bold'
                                    : 'text-[#c6c9ab] hover:text-[#e5e2e1]'
                                    }`}
                            >
                                SOCIAL
                            </button>
                        </nav>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">

                        {isAuthenticated ? (
                            <>
                                <button
                                    onClick={() => setIsStreakModalOpen(true)}
                                    className="hidden sm:flex bg-[#2a2a2a] border border-[#353534] px-3 py-1.5 rounded-full items-center gap-2 hover:bg-[#353534] hover:border-[#d2f000]/40 transition-all cursor-pointer group"
                                    title="Ver Racha Diaria (Check-in)"
                                >
                                    <Flame className="w-4 h-4 text-[#d2f000] fill-[#d2f000] group-hover:scale-110 transition-transform" />
                                    <span className="font-semibold text-xs text-[#e5e2e1]">
                                        Racha Diaria: <span className="font-bold text-[#d2f000]">{currentStreak} Días</span>
                                    </span>
                                </button>

                                {/* User badge */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowUserMenu(!showUserMenu)}
                                        className="flex items-center gap-2.5 bg-[#1c1b1b] border border-[#353534] px-1 py-1 sm:px-2.5 rounded-xl hover:border-[#454932] transition-colors cursor-pointer"
                                    >
                                        <div className="hidden sm:flex flex-col items-end">
                                            <span className="font-semibold text-xs text-[#e5e2e1] leading-none">
                                                {displayName}
                                            </span>
                                            <span className="text-[9px] font-bold text-[#d2f000] bg-[#d2f000]/10 px-1.5 py-0.5 rounded mt-1 tracking-widest uppercase shadow-[0_0_8px_rgba(210,240,0,0.2)]">
                                                {currentTier}
                                            </span>
                                        </div>

                                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-[#d2f000] overflow-hidden bg-[#2a2a2a] flex items-center justify-center">
                                            {avatarSrc ? (
                                                <img
                                                    src={avatarSrc}
                                                    alt={displayName}
                                                    className="w-full h-full object-contain bg-white p-0.5"
                                                />
                                            ) : (
                                                <User className="w-5 h-5 text-[#c6c9ab]" />
                                            )}
                                        </div>
                                        <ChevronDown className="w-3.5 h-3.5 text-[#c6c9ab] hidden sm:block" />
                                    </button>

                                    {/* Dropdown Menu */}
                                    {showUserMenu && (
                                        <div className="absolute right-0 mt-2 w-48 bg-[#1c1b1b] border border-[#353534] rounded-xl shadow-xl py-2 z-50 text-xs">
                                            <div className="px-4 py-2 border-b border-[#353534] sm:hidden">
                                                <p className="font-bold text-[#e5e2e1]">{displayName}</p>
                                                <p className="text-[10px] text-[#d2f000]">{currentTier}</p>
                                            </div>

                                            <button
                                                onClick={() => {
                                                    setActiveTabSocial("Mi Perfil");
                                                    setShowUserMenu(false);
                                                }}
                                                className="w-full flex items-center gap-2 px-4 py-2 text-[#c6c9ab] hover:text-white hover:bg-[#2a2a2a] transition-colors text-left"
                                            >
                                                <Settings className="w-4 h-4" />
                                                <span className="font-semibold">Editar perfil</span>
                                            </button>

                                        </div>
                                    )}
                                </div>
                                {/* Chiqui Coins */}
                                <div
                                    role="group"
                                    aria-label="Saldo de monedas"
                                    className="flex items-center gap-1 sm:gap-1.5 bg-[#2a2a2a] pl-1 pr-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full border border-[#353534] shrink-0"
                                >
                                    <img
                                        src="/icons/chiqui-coin-icon.png"
                                        alt=""
                                        className="h-7 w-7 sm:h-10 sm:w-10 shrink-0 rounded-full object-cover transition-transform group-hover:scale-105"
                                    />

                                    <AnimatedBalance balance={balance ?? 0} loading={loading} />

                                    <button
                                        onClick={() => setActiveTabSocial("Tienda", "coins")}
                                        className="text-[#c6c9ab] hover:text-[#d2f000] transition-colors ml-0.5 cursor-pointer shrink-0 flex items-center justify-center"
                                        title="Obtener fichas"
                                    >
                                        <PlusCircle className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <NotificationBell />
                            </>
                        ) : (
                            <button
                                onClick={() => setLoginModalOpen(true)}
                                className="bg-[#d2f000] text-[#5d6b00] font-bold py-1.5 px-4 rounded-lg hover:bg-[#b8d300] transition-colors text-xs sm:text-sm uppercase shadow-md"
                            >
                                Iniciar Sesión
                            </button>
                        )}

                    </div>
                </div>
            </header>
            </div>

            {isStreakModalOpen && (
                <StreakModal onClose={() => setIsStreakModalOpen(false)} />
            )}

            <MobileMenu activeMainTab={activeTab} onMainTabChange={setActiveTab} />
        </>
    );
};