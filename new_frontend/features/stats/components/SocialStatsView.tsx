import React, { useState } from 'react';
import { useSocialStats } from '../hooks/useStats';
import {
  LeaderboardCategory,
  LeaderboardMeta,
  LeaderboardUserStats,
  TopActiveStreakUser,
  TopChatterUser,
} from '../types/';
import { GlobalStatsBar } from './GlobalStatsBar';
import { UserStatsHero } from './UserStatsHero';
import { LeaderboardPodium } from './LeaderboardPodium';
import { LeaderboardTable } from './LeaderboardTable';
import { UserProfileModal } from './UserProfileModal';
import {
  Trophy,
  Flame,
  Rocket,
  Zap,
  Coins,
  CalendarCheck,
  MessageSquare,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

const LEADERBOARD_CATEGORIES: LeaderboardMeta[] = [
  {
    id: 'top-earners',
    title: 'Top Ganadores',
    shortTitle: 'Ganadores',
    description: 'Los reyes absolutos de las ganancias en monedas de la plataforma.',
    iconName: 'Trophy',
    metricLabel: 'Monedas Cobradas',
  },
  {
    id: 'top-streaks',
    title: 'Aciertos al Hilo (Apuestas)',
    shortTitle: 'Aciertos al Hilo',
    description: 'Jugadores con la mayor cantidad de aciertos consecutivos sin perder una sola apuesta.',
    iconName: 'Zap',
    metricLabel: 'Aciertos Seguidos',
  },
  {
    id: 'highest-multipliers',
    title: 'Multiplicador Épico',
    shortTitle: 'Cuotas Épicas',
    description: 'Las combinadas más audaces y con mayores multiplicadores acertados.',
    iconName: 'Rocket',
    metricLabel: 'Mayor Cuota Acertada',
  },
  {
    id: 'most-active',
    title: 'Más Activos',
    shortTitle: 'Actividad',
    description: 'Usuarios con mayor cantidad de boletos y pronósticos registrados.',
    iconName: 'Zap',
    metricLabel: 'Boletos Jugados',
  },
  {
    id: 'top-stakers',
    title: 'Ballenas / High Rollers',
    shortTitle: 'Mayor Volumen',
    description: 'Los jugadores que apuestan las mayores sumas de monedas en cada fecha.',
    iconName: 'Coins',
    metricLabel: 'Total Staked',
  },
  {
    id: 'top-active',
    title: 'Racha Diaria (Check-in)',
    shortTitle: 'Racha Diaria',
    description: 'Usuarios con mayor fidelidad de días consecutivos reclamando su check-in diario.',
    iconName: 'CalendarCheck',
    metricLabel: 'Días Consecutivos',
    isCustomType: 'streak',
  },
  {
    id: 'top-chatters',
    title: 'Reyes del Chat',
    shortTitle: 'Tribuna Activa',
    description: 'Los usuarios más participativos debatiendo en la tribuna en vivo.',
    iconName: 'MessageSquare',
    metricLabel: 'Mensajes Enviados',
    isCustomType: 'chat',
  },
];

interface SocialStatsViewProps {
  onBackToTribuna?: () => void;
}

export const SocialStatsView: React.FC<SocialStatsViewProps> = () => {
  const {
    globalStats,
    userStats,
    userMetrics,
    activeCategory,
    setActiveCategory,
    leaderboardData,
    rawLeaderboardData,
    isLoading,
    isRefreshing,
    limit,
    setLimit,
    searchQuery,
    setSearchQuery,
    handleRefresh,
    justLeveledUp,
  } = useSocialStats();

  const [selectedUser, setSelectedUser] = useState<
    LeaderboardUserStats | TopActiveStreakUser | TopChatterUser | null
  >(null);

  // Active Category Meta
  const activeMeta =
    LEADERBOARD_CATEGORIES.find((c) => c.id === activeCategory) || LEADERBOARD_CATEGORIES[0];

  // Separate Top 3 for podium if no search filter active
  const hasSearch = searchQuery.trim().length > 0;
  const podiumItems = !hasSearch ? rawLeaderboardData.slice(0, 3) : [];
  const tableItems = !hasSearch ? leaderboardData.slice(3) : leaderboardData;

  const renderCategoryIcon = (iconName: string, active: boolean) => {
    const cls = `w-4 h-4 ${active ? 'text-[#191e00]' : 'text-[#d2f000]'}`;
    switch (iconName) {
      case 'Trophy':
        return <Trophy className={cls} />;
      case 'Flame':
        return <Flame className={cls} />;
      case 'Rocket':
        return <Rocket className={cls} />;
      case 'Zap':
        return <Zap className={cls} />;
      case 'Coins':
        return <Coins className={cls} />;
      case 'CalendarCheck':
        return <CalendarCheck className={cls} />;
      case 'MessageSquare':
        return <MessageSquare className={cls} />;
      default:
        return <Trophy className={cls} />;
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Platform Header & Live Sync Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#353534]/60 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#e5e2e1] tracking-tight">
            Estadísticas & Salón de la Fama
          </h1>
          <p className="text-xs sm:text-sm text-[#c6c9ab] mt-0.5">
            Compite por premios en monedas, multiplicadores de récord y el reconocimiento de toda la tribuna.
          </p>
        </div>

        {/* Live Refresh Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#1c1b1b] border border-[#353534] hover:border-[#454932] text-[#e5e2e1] hover:bg-[#252525] transition-all cursor-pointer shadow-md"
            title="Actualizar datos con los endpoints del backend"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-[#d2f000] ${isRefreshing ? 'animate-spin' : ''}`}
            />
            <span>{isRefreshing ? 'Actualizando...' : 'Actualizar'}</span>
          </button>
        </div>
      </div>

      {/* 1. Personal Performance Hero ("Mi Resumen") */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#c6c9ab] flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-[#d2f000]" />
            Mi Resumen Personal
          </h3>
        </div>
        <UserStatsHero
          userStats={userStats}
          metrics={userMetrics}
          justLeveledUp={justLeveledUp}
        />
      </section>

      {/* 3. Leaderboards / Rankings Section */}
      <section className="flex flex-col gap-5">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Vertical Category Selectors */}
          <div className="w-full lg:w-64 flex flex-col gap-2 bg-[#181817] border border-[#353534] p-4 rounded-3xl shadow-xl flex-shrink-0">
            <div className="px-1 pb-2 border-b border-[#353534]/60 mb-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#c6c9ab] flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-[#d2f000]" />
                Clasificaciones
              </h3>
            </div>
            <div className="flex flex-col gap-1.5">
              {LEADERBOARD_CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id as LeaderboardCategory);
                      setSearchQuery('');
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-left ${
                      isActive
                        ? 'bg-[#d2f000] text-[#191e00] shadow-[0_0_15px_rgba(210,240,0,0.3)] font-black'
                        : 'bg-[#1c1b1b] border border-[#353534] text-[#c6c9ab] hover:text-[#e5e2e1] hover:bg-[#252524] hover:border-[#454932]'
                    }`}
                  >
                    <div className="flex-shrink-0">{renderCategoryIcon(cat.iconName, isActive)}</div>
                    <span className="truncate">{cat.shortTitle}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Main Leaderboard Section */}
          <div className="flex-1 w-full min-w-0 flex flex-col gap-5">
            {/* Section Header & Category Description */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 bg-[#181817] border border-[#353534] p-5 rounded-3xl shadow-lg">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#e5e2e1] tracking-tight flex items-center gap-2">
                  <span>{activeMeta.title}</span>
                  <span className="text-xs font-bold font-mono text-[#d2f000] bg-[#d2f000]/10 px-2 py-0.5 rounded-full border border-[#d2f000]/20">
                    Oficial
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-[#c6c9ab] mt-1">{activeMeta.description}</p>
              </div>
            </div>

            {/* Podium for Top 3 (Shown when no search filter is active) */}
            {!hasSearch && podiumItems.length >= 3 && (
              <LeaderboardPodium
                category={activeCategory}
                items={podiumItems}
                onSelectUser={(u) => setSelectedUser(u)}
              />
            )}

            {/* Leaderboard Table for Positions 4+ or all search results */}
            <LeaderboardTable
              category={activeCategory}
              items={tableItems}
              startIndex={!hasSearch ? 3 : 0}
              currentUserId={userStats?.userId || 'user-uuid-abc'}
              onSelectUser={(u) => setSelectedUser(u)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              limit={limit}
              onLimitChange={setLimit}
            />
          </div>
        </div>
      </section>

      {/* 3. Global Platform KPIs (Ubicado al pie de la página) */}
      <section className="flex flex-col gap-3 pt-6 border-t border-[#353534]/50 mt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#d2f000]" />
            <h3 className="text-xs font-black uppercase tracking-wider text-[#c6c9ab]">
              Métricas Globales de la Plataforma
            </h3>
          </div>
          <span className="text-[10px] text-[#c6c9ab]/60 font-mono">
            GET /stats/global · Acumulado
          </span>
        </div>
        <GlobalStatsBar stats={globalStats} isLoading={isLoading && !globalStats} />
      </section>

      {/* User Inspection Modal */}
      {selectedUser && (
        <UserProfileModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
    </div>
  );
};
