import React from 'react';
import clsx from 'clsx';
import { NAME_COLORS } from '@/features/chat/config/ColorsRegistry';
import {
  LeaderboardUserStats,
  TopActiveStreakUser,
  TopChatterUser,
  LeaderboardCategory,
} from '../types';
import { Crown, Flame, Rocket, Coins, MessageSquare, Award, Sparkles, Zap } from 'lucide-react';

interface LeaderboardPodiumProps {
  category: LeaderboardCategory;
  items: (LeaderboardUserStats | TopActiveStreakUser | TopChatterUser)[];
  onSelectUser?: (user: LeaderboardUserStats | TopActiveStreakUser | TopChatterUser) => void;
}

export const LeaderboardPodium: React.FC<LeaderboardPodiumProps> = ({
  category,
  items,
  onSelectUser,
}) => {
  if (items.length < 3) return null;

  const first = items[0];
  const second = items[1];
  const third = items[2];

  // Helper to get formatted metric display
  const getMetricDisplay = (
    item: LeaderboardUserStats | TopActiveStreakUser | TopChatterUser
  ): { value: string; label: string; icon: React.ReactNode } => {
    if (category === 'top-chatters' && 'messageCount' in item) {
      return {
        value: new Intl.NumberFormat('es-AR').format(item.messageCount),
        label: 'mensajes',
        icon: <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />,
      };
    }
    if (category === 'top-active' && 'currentStreak' in item) {
      return {
        value: `${item.currentStreak} días`,
        label: 'racha diaria',
        icon: <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />,
      };
    }

    const coinIcon = (
      <div className="w-4.5 h-4.5 rounded-full overflow-hidden flex-shrink-0">
        <img src="/icons/chiqui-coin-icon.png" alt="Chiqui Coin" className="w-full h-full object-cover" />
      </div>
    );

    const betStat = item as LeaderboardUserStats;
    if (category === 'top-earners') {
      return {
        value: `${new Intl.NumberFormat('es-AR').format(betStat.totalCoinsWon)}`,
        label: 'ganadas',
        icon: coinIcon,
      };
    }
    if (category === 'top-streaks') {
      return {
        value: `${betStat.longestWinStreak} aciertos`,
        label: 'aciertos al hilo',
        icon: <Zap className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />,
      };
    }
    if (category === 'highest-multipliers') {
      return {
        value: `${betStat.highestMultiplier.toFixed(1)}x`,
        label: 'cuota récord',
        icon: <Rocket className="w-3.5 h-3.5 text-cyan-400" />,
      };
    }
    if (category === 'most-active') {
      return {
        value: `${betStat.totalBetsPlaced}`,
        label: 'apuestas hechas',
        icon: <Sparkles className="w-3.5 h-3.5 text-emerald-400" />,
      };
    }
    if (category === 'top-stakers') {
      return {
        value: `${new Intl.NumberFormat('es-AR').format(betStat.totalCoinsStaked)}`,
        label: 'staked total',
        icon: coinIcon,
      };
    }

    return {
      value: `${betStat.totalCoinsWon || 0}`,
      label: 'monedas',
      icon: coinIcon,
    };
  };

  const getUserInfo = (
    item: LeaderboardUserStats | TopActiveStreakUser | TopChatterUser
  ): {
    username: string;
    avatarUrl: string;
    activeNameColorId?: string | null;
  } => {
    let username = 'usuario';
    let activeNameColorId: string | null | undefined = null;
    let teamBadge: string | null | undefined = null;

    if ('user' in item) {
      username = item.user.username || 'anonimo';
      activeNameColorId = item.user.activeNameColorId;
      teamBadge = item.user.team?.badgeUrl;
    } else {
      username = item.username || 'anonimo';
      activeNameColorId = (item as any).activeNameColorId;
      teamBadge = item.team?.badgeUrl;
    }

    const avatarUrl = teamBadge || '/escudos/default.webp';

    return {
      username,
      avatarUrl,
      activeNameColorId,
    };
  };

  const renderPodiumPosition = (
    item: LeaderboardUserStats | TopActiveStreakUser | TopChatterUser,
    position: 1 | 2 | 3
  ) => {
    const info = getUserInfo(item);
    const metric = getMetricDisplay(item);
    const activeColor = NAME_COLORS[info.activeNameColorId || "default"] || NAME_COLORS.default;

    const isFirst = position === 1;
    const isSecond = position === 2;

    const rankBorder = isFirst
      ? 'border-[#ffd700] ring-4 ring-[#ffd700]/25'
      : isSecond
      ? 'border-[#c0c0c0] ring-2 ring-[#c0c0c0]/20'
      : 'border-[#cd7f32] ring-2 ring-[#cd7f32]/20';

    const rankBadgeBg = isFirst
      ? 'bg-gradient-to-b from-[#ffe57f] to-[#e6a100] text-[#191e00]'
      : isSecond
      ? 'bg-gradient-to-b from-[#e0e0e0] to-[#9e9e9e] text-[#121212]'
      : 'bg-gradient-to-b from-[#d79a61] to-[#8d5325] text-white';

    const pillarHeight = isFirst ? 'h-48 md:h-56' : isSecond ? 'h-36 md:h-44' : 'h-28 md:h-36';

    const pillarBg = isFirst
      ? 'bg-gradient-to-b from-[#2a270a] via-[#1c1b1b] to-[#141414] border-t-2 border-[#ffd700]/60'
      : isSecond
      ? 'bg-gradient-to-b from-[#222426] via-[#1c1b1b] to-[#141414] border-t-2 border-[#c0c0c0]/40'
      : 'bg-gradient-to-b from-[#261d19] via-[#1c1b1b] to-[#141414] border-t-2 border-[#cd7f32]/40';

    return (
      <div
        key={position}
        onClick={() => onSelectUser?.(item)}
        className={`flex flex-col items-center flex-1 cursor-pointer group transition-transform duration-300 hover:-translate-y-1 ${
          isFirst ? 'order-2 z-10' : isSecond ? 'order-1' : 'order-3'
        }`}
      >
        {/* Crown or Laurel on Top */}
        <div className="h-8 flex items-center justify-center mb-1">
          {isFirst ? (
            <Crown className="w-8 h-8 text-[#ffd700] fill-[#ffd700] animate-bounce filter drop-shadow-[0_0_8px_rgba(255,215,0,0.6)]" />
          ) : isSecond ? (
            <span className="text-xs font-black tracking-widest text-[#c0c0c0] uppercase">
              2º Puesto
            </span>
          ) : (
            <span className="text-xs font-black tracking-widest text-[#cd7f32] uppercase">
              3º Puesto
            </span>
          )}
        </div>

        {/* User Avatar (Escudo del equipo) with Rank Pin - Badge Overlay removed */}
        <div className="relative mb-3">
          <div
            className={`rounded-2xl overflow-hidden p-1 shadow-2xl transition-all duration-300 bg-[#1c1b1b] flex items-center justify-center ${
              isFirst ? 'w-20 h-20 md:w-24 md:h-24' : 'w-16 h-16 md:w-20 md:h-20'
            } ${rankBorder} group-hover:scale-105`}
          >
            <img
              src={info.avatarUrl}
              alt={info.username}
              className="w-full h-full object-contain rounded-xl"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/escudos/default.webp';
              }}
            />
          </div>

          {/* Rank Number Capsule */}
          <div
            className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full font-black text-xs shadow-lg flex items-center gap-1 ${rankBadgeBg}`}
          >
            <span>#{position}</span>
          </div>
        </div>

        {/* Username with color style */}
        <div className="text-center px-2 mb-2 w-full max-w-[140px]">
          <h4 className={clsx("text-sm font-black truncate", activeColor.textClass)}>
            @{info.username}
          </h4>
        </div>

        {/* Pillar Podium Platform */}
        <div
          className={`w-full ${pillarHeight} ${pillarBg} rounded-t-2xl border-x border-[#353534] p-3 flex flex-col items-center justify-start text-center relative overflow-hidden shadow-2xl`}
        >
          {/* Subtle Glow at top */}
          <div
            className={`absolute top-0 left-0 right-0 h-1 blur-sm ${
              isFirst ? 'bg-[#ffd700]' : isSecond ? 'bg-[#c0c0c0]' : 'bg-[#cd7f32]'
            }`}
          />

          <div className="mt-2 flex flex-col items-center">
            <div className="flex items-center gap-1.5 mb-0.5">
              {metric.icon}
              <span className="text-sm md:text-base font-black text-[#e5e2e1] font-mono tracking-tight">
                {metric.value}
              </span>
            </div>
            <span className="text-[10px] uppercase font-bold text-[#c6c9ab] tracking-wider">
              {metric.label}
            </span>
          </div>

          <div className="mt-auto pb-2">
            <span className="text-[10px] font-bold text-[#d2f000] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              Ver perfil →
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#181817] border border-[#353534] rounded-3xl p-5 md:p-6 shadow-2xl relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-[#d2f000]/5 via-transparent to-transparent pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b border-[#353534]/60 pb-3">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-[#d2f000]" />
          <h3 className="font-black text-sm md:text-base text-[#e5e2e1] uppercase tracking-wider">
            Mejor Podio (Top 3)
          </h3>
        </div>
      </div>

      {/* Podium layout: 2nd (left), 1st (center), 3rd (right) */}
      <div className="flex items-end justify-center gap-2 md:gap-4 pt-4 px-2">
        {renderPodiumPosition(second, 2)}
        {renderPodiumPosition(first, 1)}
        {renderPodiumPosition(third, 3)}
      </div>
    </div>
  );
};

