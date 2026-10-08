import React from 'react';
import clsx from 'clsx';
import { NAME_COLORS } from '@/features/chat/config/ColorsRegistry';
import {
  LeaderboardUserStats,
  TopActiveStreakUser,
  TopChatterUser,
  LeaderboardCategory,
} from '../types';
import {
  Flame,
  Rocket,
  Coins,
  MessageSquare,
  Award,
  ChevronRight,
  TrendingUp,
  Search,
  User,
  Zap,
} from 'lucide-react';

interface LeaderboardTableProps {
  category: LeaderboardCategory;
  items: (LeaderboardUserStats | TopActiveStreakUser | TopChatterUser)[];
  currentUserId?: string;
  startIndex?: number;
  onSelectUser?: (user: LeaderboardUserStats | TopActiveStreakUser | TopChatterUser) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  limit: number;
  onLimitChange: (limit: number) => void;
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
  category,
  items,
  currentUserId = 'u-gonza',
  startIndex = 0,
  onSelectUser,
  searchQuery,
  onSearchChange,
  limit,
  onLimitChange,
}) => {
  // Helper to format metric
  const formatMetric = (item: LeaderboardUserStats | TopActiveStreakUser | TopChatterUser) => {
    if (category === 'top-chatters' && 'messageCount' in item) {
      return {
        val: new Intl.NumberFormat('es-AR').format(item.messageCount),
        sub: 'mensajes',
        icon: <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />,
      };
    }
    if (category === 'top-active' && 'currentStreak' in item) {
      return {
        val: `${item.currentStreak} días`,
        sub: 'racha diaria',
        icon: <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />,
      };
    }

    const coinIcon = (
      <div className="w-4 h-4 rounded-full overflow-hidden flex-shrink-0">
        <img src="/icons/chiqui-coin-icon.png" alt="Chiqui Coin" className="w-full h-full object-cover" />
      </div>
    );

    const betStat = item as LeaderboardUserStats;
    if (category === 'top-earners') {
      return {
        val: `${new Intl.NumberFormat('es-AR').format(betStat.totalCoinsWon)}`,
        sub: `Apostadas: ${new Intl.NumberFormat('es-AR').format(betStat.totalCoinsStaked)}`,
        icon: coinIcon,
      };
    }
    if (category === 'top-streaks') {
      return {
        val: `${betStat.longestWinStreak} aciertos`,
        sub: `Actual: x${betStat.currentWinStreak} al hilo`,
        icon: <Zap className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />,
      };
    }
    if (category === 'highest-multipliers') {
      return {
        val: `${betStat.highestMultiplier.toFixed(1)}x`,
        sub: 'cuota récord',
        icon: <Rocket className="w-3.5 h-3.5 text-cyan-400" />,
      };
    }
    if (category === 'most-active') {
      return {
        val: `${betStat.totalBetsPlaced} apuestas`,
        sub: `${betStat.totalBetsWon} ganadas`,
        icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />,
      };
    }
    if (category === 'top-stakers') {
      return {
        val: `${new Intl.NumberFormat('es-AR').format(betStat.totalCoinsStaked)}`,
        sub: `Ganadas: ${new Intl.NumberFormat('es-AR').format(betStat.totalCoinsWon)}`,
        icon: coinIcon,
      };
    }

    return {
      val: `${betStat.totalCoinsWon || 0}`,
      sub: '',
      icon: coinIcon,
    };
  };

  const getUserDetails = (item: LeaderboardUserStats | TopActiveStreakUser | TopChatterUser) => {
    let username = 'usuario';
    let userId = item.id;
    let activeNameColorId: string | null | undefined = null;
    let teamBadge: string | null | undefined = null;

    if ('user' in item) {
      username = item.user.username || 'anonimo';
      userId = item.userId;
      activeNameColorId = item.user.activeNameColorId;
      teamBadge = item.user.team?.badgeUrl;
    } else {
      username = item.username || 'anonimo';
      activeNameColorId = (item as any).activeNameColorId;
      teamBadge = item.team?.badgeUrl;
    }

    const avatarUrl = teamBadge || '/escudos/default.webp';

    const isCurrentUser =
      username.toLowerCase() === 'gonzadev' ||
      userId === currentUserId ||
      userId === 'user-uuid-abc';

    return {
      username,
      avatarUrl,
      activeNameColorId,
      isCurrentUser,
    };
  };

  return (
    <div className="bg-[#181817] border border-[#353534] rounded-3xl p-5 md:p-6 shadow-2xl flex flex-col gap-4">
      {/* Table Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-[#353534]/60 pb-4">
        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#c6c9ab] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por usuario..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-[#131313] border border-[#353534] rounded-xl pl-9 pr-3 py-2 text-xs text-[#e5e2e1] placeholder-[#c6c9ab]/60 focus:outline-none focus:border-[#d2f000]"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#c6c9ab] hover:text-[#e5e2e1]"
            >
              ✕
            </button>
          )}
        </div>

        {/* Limit Toggle */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <span className="text-xs text-[#c6c9ab] mr-1">Mostrar:</span>
          {[5, 10, 25].map((l) => (
            <button
              key={l}
              onClick={() => onLimitChange(l)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                limit === l
                  ? 'bg-[#d2f000] text-[#191e00]'
                  : 'bg-[#1c1b1b] text-[#c6c9ab] hover:text-[#e5e2e1] border border-[#353534]'
              }`}
            >
              Top {l}
            </button>
          ))}
        </div>
      </div>

      {/* Rows List */}
      {items.length === 0 ? (
        <div className="py-12 text-center text-[#c6c9ab] flex flex-col items-center gap-2">
          <User className="w-8 h-8 text-[#353534]" />
          <p className="text-sm font-semibold">No se encontraron jugadores con ese filtro</p>
          <button
            onClick={() => onSearchChange('')}
            className="text-xs text-[#d2f000] hover:underline cursor-pointer"
          >
            Limpiar búsqueda
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item, idx) => {
            const pos = startIndex + idx + 1;
            const details = getUserDetails(item);
            const metric = formatMetric(item);
            const activeColor = NAME_COLORS[details.activeNameColorId || "default"] || NAME_COLORS.default;

            return (
              <div
                key={item.id || idx}
                onClick={() => onSelectUser?.(item)}
                className={`flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer group ${
                  details.isCurrentUser
                    ? 'bg-[#252814]/80 border-[#d2f000] shadow-[0_0_15px_rgba(210,240,0,0.15)] ring-1 ring-[#d2f000]/40'
                    : 'bg-[#1c1b1b]/80 border-[#353534]/70 hover:border-[#454932] hover:bg-[#222221]'
                }`}
              >
                {/* Left: Position Rank & User Identity */}
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  {/* Position Badge */}
                  <div className="w-7 sm:w-8 text-center flex-shrink-0">
                    <span
                      className={`font-black text-xs sm:text-sm font-mono ${
                        pos === 1
                          ? 'text-[#ffd700]'
                          : pos === 2
                          ? 'text-[#c0c0c0]'
                          : pos === 3
                          ? 'text-[#cd7f32]'
                          : details.isCurrentUser
                          ? 'text-[#d2f000]'
                          : 'text-[#c6c9ab]'
                      }`}
                    >
                      #{pos}
                    </span>
                  </div>

                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div
                      className={`w-10 h-10 rounded-xl overflow-hidden p-0.5 bg-[#131313] border flex items-center justify-center ${
                        details.isCurrentUser
                          ? 'border-[#d2f000]'
                          : 'border-[#353534] group-hover:border-[#454932]'
                      }`}
                    >
                      <img
                        src={details.avatarUrl}
                        alt={details.username}
                        className="w-full h-full object-contain rounded-lg"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/escudos/default.webp';
                        }}
                      />
                    </div>
                  </div>

                  {/* Painted Username */}
                  <div className="min-w-0 flex items-center gap-1.5">
                    <span className={clsx("text-xs sm:text-sm font-black truncate", activeColor.textClass)}>
                      @{details.username}
                    </span>
                    {details.isCurrentUser && (
                      <span className="bg-[#d2f000] text-[#191e00] font-black text-[9px] px-1.5 py-0.5 rounded-md uppercase tracking-wider flex-shrink-0">
                        TÚ
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Metric Value & Action */}
                <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0 ml-2">
                  <div className="text-right flex flex-col items-end">
                    <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm text-[#e5e2e1] font-mono">
                      {metric.icon}
                      <span>{metric.val}</span>
                    </div>
                    {metric.sub && (
                      <span className="text-[10px] text-[#c6c9ab] font-medium hidden sm:inline">
                        {metric.sub}
                      </span>
                    )}
                  </div>

                  <ChevronRight className="w-4 h-4 text-[#c6c9ab] group-hover:text-[#d2f000] group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

