"use client";

import React, { useState } from 'react';
import { Flame, Bell, Gift, PlusCircle, ChevronDown, Menu, User, Zap } from 'lucide-react';
import { useUserStore } from "@/store/useUserStore";
import { useWallet } from "@/features/wallet/socket/useWalletSocket";
import NotificationBell from '@/features/notifications/components/NotificationBell';
import StreakModal from '@/features/streak/components/StreakModal';
import { useUIStore } from '@/store/useUIStore';
import { AnimatedBalance } from '@/features/wallet/components/AnimatedBalance';
import { useMyWinStreak } from '@/features/stats/hooks/useStats';

interface HeaderProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
    activeTab,
    setActiveTab,
}) => {
    const toggleMobileSidebar = useUIStore((state) => state.toggleMobileSidebar)
    const [showUserMenu, setShowUserMenu] = useState(false);

    const id = useUserStore((state) => state.id);
    const isAuthenticated = !!id;
    const username = useUserStore((state) => state.username);
    const name = useUserStore((state) => state.name);
    const currentStreak = useUserStore((state) => state.currentStreak);
    const team = useUserStore((state) => state.team);
    const tier = useUserStore((state) => state.tier);

    const setLoginModalOpen = useUserStore((state) => state.setLoginModalOpen);
    const setIsStreakModalOpen = useUserStore((state) => state.setIsStreakModalOpen);

    const isStreakModalOpen = useUserStore((state) => state.isStreakModalOpen);

    const { balance, loading } = useWallet();

    const { data: winStreak = 0 } = useMyWinStreak();

    const displayName = username ?? name ?? "Usuario";
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
            <header className="fixed top-0 left-0 w-full z-50 border-b border-[#353534] shadow-md bg-[#131313]/95 backdrop-blur-md">
                <div className="flex justify-between items-center h-16 px-4 md:px-8 max-w-[1920px] mx-auto">
                    <div className="flex items-center gap-4 md:gap-6">
                        <button
                            onClick={toggleMobileSidebar}
                            className="md:hidden p-2 text-[#c6c9ab] hover:text-[#e5e2e1] focus:outline-none"
                            title="Abrir menú"
                        >
                            <Menu className="w-6 h-6" />
                        </button>

                        <a href="/" className="flex items-center gap-2 group">
                            <img
                                src="/logo/chiqui-mafias-logo.png"
                                alt="Chiqui Mafias Logo"
                                className="h-12 w-auto object-contain transition-transform group-hover:scale-105"
                            />
                        </a>

                        <nav className="hidden lg:flex items-center gap-6 ml-2">
                            <button
                                onClick={() => setActiveTab('ligas')}
                                className={`font-semibold text-xs md:text-sm uppercase tracking-wider px-2 py-1 rounded transition-colors ${activeTab === 'ligas'
                                    ? 'text-[#d2f000] border-b-2 border-[#d2f000]'
                                    : 'text-[#c6c9ab] hover:text-[#e5e2e1] hover:bg-[#353534]/50'
                                    }`}
                            >
                                LIGAS
                            </button>
                            <button
                                onClick={() => setActiveTab('calendario')}
                                className={`font-semibold text-xs md:text-sm uppercase tracking-wider px-2 py-1 rounded transition-colors ${activeTab === 'calendario'
                                    ? 'text-[#d2f000] border-b-2 border-[#d2f000]'
                                    : 'text-[#c6c9ab] hover:text-[#e5e2e1] hover:bg-[#353534]/50'
                                    }`}
                            >
                                CALENDARIO
                            </button>
                            <button
                                onClick={() => setActiveTab('social')}
                                className={`font-semibold text-xs md:text-sm uppercase tracking-wider px-2 py-1 transition-transform ${activeTab === 'social'
                                    ? 'text-[#d2f000] border-b-2 border-[#d2f000] font-bold'
                                    : 'text-[#c6c9ab] hover:text-[#e5e2e1]'
                                    }`}
                            >
                                SOCIAL
                            </button>
                        </nav>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">

                        {isAuthenticated ? (
                            <>
                                {winStreak > 0 && (
                                    <div
                                        className="hidden sm:flex bg-cyan-950/50 border border-cyan-400/40 px-3 py-1.5 rounded-full items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.25)] animate-in fade-in zoom-in-95 duration-300"
                                        title="Aciertos al hilo en apuestas consecutivas"
                                    >
                                        <Zap className="w-4 h-4 text-cyan-400 fill-cyan-400 animate-pulse" />
                                        <span className="font-black text-xs text-cyan-300 tracking-wide">
                                            Aciertos al Hilo: <span className="font-mono text-cyan-400">x{winStreak}</span>
                                        </span>
                                    </div>
                                )}

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
                                        className="flex items-center gap-2.5 bg-[#1c1b1b] border border-[#353534] px-2.5 py-1 rounded-xl hover:border-[#454932] transition-colors cursor-pointer"
                                    >
                                        <div className="hidden sm:flex flex-col items-end">
                                            <span className="font-semibold text-xs text-[#e5e2e1] leading-none">
                                                {displayName}
                                            </span>
                                            <span className="text-[9px] font-bold text-[#d2f000] bg-[#d2f000]/10 px-1.5 py-0.5 rounded mt-1 tracking-widest uppercase shadow-[0_0_8px_rgba(210,240,0,0.2)]">
                                                {currentTier}
                                            </span>
                                        </div>

                                        <div className="w-9 h-9 rounded-full border-2 border-[#d2f000] overflow-hidden bg-[#2a2a2a] flex items-center justify-center">
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
                                                    setShowUserMenu(false);
                                                }}
                                                className="w-full text-left px-4 py-2 hover:bg-[#2a2a2a] text-[#e5e2e1] flex items-center gap-2"
                                            >
                                                <Gift className="w-3.5 h-3.5 text-[#d2f000]" /> Recompensa Diaria
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setShowUserMenu(false);
                                                }}
                                                className="w-full text-left px-4 py-2 hover:bg-[#2a2a2a] text-[#e5e2e1] flex items-center gap-2"
                                            >
                                                <PlusCircle className="w-3.5 h-3.5 text-[#d2f000]" /> Cargar Fichas
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Chiqui Coins */}
                                <div className="flex items-center gap-1.5 bg-[#2a2a2a] px-2.5 py-1.5 rounded-full border border-[#353534]">
                                    <img
                                        src="/icons/chiqui-coin-icon.png"
                                        alt="Chiqui Mafias Logo"
                                        className="h-10 w-10 rounded-full object-cover transition-transform group-hover:scale-105"
                                    />

                                    <AnimatedBalance balance={balance ?? 0} loading={loading} />

                                    <button
                                        className="text-[#c6c9ab] hover:text-[#d2f000] transition-colors ml-0.5"
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

            {isStreakModalOpen && (
                <StreakModal onClose={() => setIsStreakModalOpen(false)} />
            )}
        </>
    );
};