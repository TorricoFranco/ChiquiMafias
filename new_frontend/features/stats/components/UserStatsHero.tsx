"use client";

import React from 'react';
import { UserStats } from '../types';
import {
  Flame,
  Trophy,
  Rocket,
  TrendingUp,
  Percent,
  Coins,
  Zap,
} from 'lucide-react';
import clsx from 'clsx';
import { useUserStore } from '@/store/useUserStore';
import { NAME_COLORS } from '@/features/chat/config/ColorsRegistry';
import { TIER_UI_CONFIG, SubscriptionTier } from "@/features/auth/constants/ROLES_SUBSCRIPTION";
import { getBannerUrl } from '@/features/chat/config/BannersRegistry';

interface UserStatsHeroProps {
  userStats: UserStats | null;
  metrics: {
    winRate: number;
    netProfit: number;
    roi: number;
    isProfitable: boolean;
  } | null;
  justLeveledUp?: boolean;
}

export const UserStatsHero: React.FC<UserStatsHeroProps> = ({
  userStats,
  metrics,
  justLeveledUp,
}) => {
  const {
    username,
    team,
    tier,
    activeBannerId,
    activeNameColorId
  } = useUserStore();


  if (!userStats || !metrics) {
    return (
      <div className="h-64 bg-[#1c1b1b] border border-[#353534] rounded-3xl animate-pulse" />
    );
  }

  const formatCoins = (coins: number) => {
    return new Intl.NumberFormat('es-AR').format(coins);
  };

  const getBettorTitle = (winRate: number, maxStreak: number) => {
    if (winRate > 60 && maxStreak >= 10) return 'Para un poko lanzini';
    if (winRate > 55) return 'El verdadero cra';
    if (maxStreak >= 5) return 'Gordo fulbolero';
    return 'Makina';
  };

  const bettorTitle = getBettorTitle(metrics.winRate, userStats.longestWinStreak);

  const activeColor = NAME_COLORS[activeNameColorId || "default"] || NAME_COLORS.default;
  const headerBannerUrl = getBannerUrl(activeBannerId || null);


  return (
    <div
      className={`relative rounded-3xl border transition-all duration-500 overflow-hidden shadow-2xl ${justLeveledUp
        ? 'border-[#d2f000] shadow-[0_0_40px_rgba(210,240,0,0.35)] ring-2 ring-[#d2f000]/50'
        : 'border-[#353534] hover:border-[#454932] shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
        } bg-[#181817]`}
    >
      <div className="h-40 sm:h-48 md:h-52 w-full relative overflow-hidden bg-gradient-to-r from-[#21270b] via-[#1a2215] to-[#141d24]">

        {activeBannerId && (
          <img
            src={headerBannerUrl}
            alt="Banner de perfil"
            className="w-full h-full object-cover object-center transition-all"
            onError={(e) => {
              e.currentTarget.src = getBannerUrl('default');
            }}
          />
        )}

        <div className="absolute inset-0 bg-[radial-gradient(#d2f000_1px,transparent_1px)] [background-size:16px_16px] opacity-10" />
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-[#d2f000]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="absolute top-4 left-4 flex items-center gap-2">
          {tier && tier !== SubscriptionTier.NONE && TIER_UI_CONFIG[tier as string] && (
            <span
              className="text-[10px] font-black uppercase px-2.5 py-1 rounded shadow-sm tracking-wide border border-black/20"
              style={{
                backgroundColor: TIER_UI_CONFIG[tier as string].badgeColor,
                color: TIER_UI_CONFIG[tier as string].textColor,
              }}
            >
              {TIER_UI_CONFIG[tier as string].badge}
            </span>
          )}
        </div>
      </div>

      {/* Main Stats Card Body */}
      <div className="px-6 pb-6 pt-0 relative">
        {/* User Identity Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-14 mb-6">
          <div className="flex items-end gap-4">

            {/* Avatar (Escudo del equipo) con Glow y Streak Badge */}
            <div className="relative">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[#1c1b1b] border-2 border-[#d2f000] overflow-hidden p-1 shadow-xl relative group flex items-center justify-center">
                <img
                  src={team?.badgeUrl || '/escudos/default.webp'} // Escudo completo desde el team
                  alt={username || 'Usuario'}
                  className="w-full h-full object-contain rounded-xl group-hover:scale-105 transition-transform"
                />
              </div>
              {/* Flame streak badge overlapping avatar */}
              <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-amber-500 to-red-500 text-white text-[11px] font-black px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1 border border-black/40">
                <Flame className="w-3.5 h-3.5 fill-yellow-200 animate-pulse" />
                <span>{userStats.currentWinStreak}</span>
              </div>
            </div>

            {/* Solo Username pintado y Título (sin el name original) */}
            <div className="flex flex-col pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className={clsx("text-xl sm:text-2xl font-black tracking-tight", activeColor.textClass)}>
                  {username || 'Usuario'}
                </h2>
                <span className="bg-[#d2f000]/10 border border-[#d2f000]/30 text-[#d2f000] text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                  {bettorTitle}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Highlight Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Metric 1: Win Rate */}
          <div className="bg-[#1c1b1b] border border-[#353534] hover:border-[#454932] p-3.5 rounded-2xl flex flex-col justify-between transition-colors">
            <div className="flex items-center justify-between text-[#c6c9ab] mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Efectividad</span>
              <Percent className="w-3.5 h-3.5 text-[#d2f000]" />
            </div>
            <div>
              <div className="text-2xl font-black text-[#e5e2e1] tracking-tight">
                {metrics.winRate}%
              </div>
              <div className="w-full bg-[#2a2a2a] h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-[#d2f000] h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(metrics.winRate, 100)}%` }}
                />
              </div>
            </div>
            <span className="text-[10px] text-[#c6c9ab] mt-2 font-mono">
              {userStats.totalBetsWon} / {userStats.totalBetsPlaced} aciertos
            </span>
          </div>

          {/* Metric 2: Racha Actual Apuestas */}
          <div className="bg-[#1c1b1b] border border-[#353534] hover:border-cyan-500/50 p-3.5 rounded-2xl flex flex-col justify-between transition-colors bg-gradient-to-b from-[#1c1b1b] to-cyan-950/20">
            <div className="flex items-center justify-between text-[#c6c9ab] mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                Aciertos al Hilo
              </span>
              <Zap className="w-4 h-4 text-cyan-400 fill-cyan-400 animate-pulse" />
            </div>
            <div>
              <div className="text-2xl font-black text-cyan-400 tracking-tight flex items-baseline gap-1 font-mono">
                <span>x{userStats.currentWinStreak}</span>
                <span className="text-xs font-semibold text-[#c6c9ab]">apuestas</span>
              </div>
            </div>
          </div>

          {/* Metric 3: Récord Racha Histórica */}
          <div className="bg-[#1c1b1b] border border-[#353534] hover:border-[#454932] p-3.5 rounded-2xl flex flex-col justify-between transition-colors">
            <div className="flex items-center justify-between text-[#c6c9ab] mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Récord Aciertos</span>
              <Trophy className="w-3.5 h-3.5 text-yellow-400" />
            </div>
            <div>
              <div className="text-2xl font-black text-[#e5e2e1] tracking-tight font-mono">
                {userStats.longestWinStreak}
              </div>
              <p className="text-[10px] text-[#c6c9ab] mt-1">Máximo aciertos seguidos</p>
            </div>
          </div>

          {/* Metric 4: Multiplicador Récord */}
          <div className="bg-[#1c1b1b] border border-[#353534] hover:border-cyan-500/50 p-3.5 rounded-2xl flex flex-col justify-between transition-colors">
            <div className="flex items-center justify-between text-[#c6c9ab] mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                Mejor Cuota
              </span>
              <Rocket className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div>
              <div className="text-2xl font-black text-cyan-400 font-mono tracking-tight">
                {userStats.highestMultiplier.toFixed(1)}x
              </div>
              <p className="text-[10px] text-[#c6c9ab] mt-1">Acierto combinada récord</p>
            </div>
          </div>

          {/* Metric 5: Monedas Ganadas */}
          <div className="bg-[#1c1b1b] border border-[#353534] hover:border-[#454932] p-3.5 rounded-2xl flex flex-col justify-between transition-colors">
            <div className="flex items-center justify-between text-[#c6c9ab] mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Cobrado</span>
              <div className="w-4 h-4 rounded-full overflow-hidden flex-shrink-0">
                <img src="/icons/chiqui-coin-icon.png" alt="Chiqui Coin" className="w-full h-full object-cover" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-[#d2f000] font-mono tracking-tight flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                  <img src="/icons/chiqui-coin-icon.png" alt="Chiqui Coin" className="w-full h-full object-cover" />
                </div>
                <span>{formatCoins(userStats.totalCoinsWon)}</span>
              </div>
              <span className="text-[10px] text-[#c6c9ab] font-medium flex items-center gap-1 mt-1">
                <div className="w-3.5 h-3.5 rounded-full overflow-hidden flex-shrink-0">
                  <img src="/icons/chiqui-coin-icon.png" alt="Chiqui Coin" className="w-full h-full object-cover" />
                </div>
                Monedas brutas
              </span>
            </div>
            <span className="text-[10px] text-[#c6c9ab] mt-2 flex items-center gap-1">
              <div className="w-3 h-3 rounded-full overflow-hidden flex-shrink-0">
                <img src="/icons/chiqui-coin-icon.png" alt="Chiqui Coin" className="w-full h-full object-cover" />
              </div>
              Apostadas: {formatCoins(userStats.totalCoinsStaked)}
            </span>
          </div>

          {/* Metric 6: Ganancia Neta / ROI */}
          <div className="bg-[#1c1b1b] border border-[#353534] hover:border-emerald-500/50 p-3.5 rounded-2xl flex flex-col justify-between transition-colors bg-gradient-to-b from-[#1c1b1b] to-emerald-950/20">
            <div className="flex items-center justify-between text-[#c6c9ab] mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                Balance Neto
              </span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div>
              <div className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
                +{formatCoins(metrics.netProfit)}
              </div>
              <span className="text-[10px] font-bold text-emerald-400/90">
                ROI: +{metrics.roi}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
