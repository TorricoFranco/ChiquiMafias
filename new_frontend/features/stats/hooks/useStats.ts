import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { statsApi } from '../api/statsApi';
import { useUserStore } from '@/store/useUserStore';
import {
  LeaderboardUserStats,
  TopActiveStreakUser,
  TopChatterUser,
  LeaderboardCategory,
} from '../types/';

export const STATS_KEYS = {
  all: ['stats'] as const,
  me: () => [...STATS_KEYS.all, 'me'] as const,
  user: (userId: string) => [...STATS_KEYS.all, 'user', userId] as const,
  topEarners: (limit: number) => [...STATS_KEYS.all, 'top-earners', limit] as const,
  topStreaks: (limit: number) => [...STATS_KEYS.all, 'top-streaks', limit] as const,
  highestMultipliers: (limit: number) => [...STATS_KEYS.all, 'highest-multipliers', limit] as const,
  mostActive: (limit: number) => [...STATS_KEYS.all, 'most-active', limit] as const,
  topStakers: (limit: number) => [...STATS_KEYS.all, 'top-stakers', limit] as const,
  global: () => [...STATS_KEYS.all, 'global'] as const,
};

export function useMyStats() {
  const userId = useUserStore((state) => state.id);
  return useQuery({
    queryKey: STATS_KEYS.me(),
    queryFn: statsApi.getMyStats,
    staleTime: 1000 * 60 * 5,
    enabled: !!userId,
  });
}

export function useMyWinStreak() {
  const userId = useUserStore((state) => state.id);
  return useQuery({
    queryKey: STATS_KEYS.me(),
    queryFn: statsApi.getMyStats,
    select: (data) => data.currentWinStreak,
    staleTime: 1000 * 60 * 5,
    enabled: !!userId,
  });
}

export function useTopEarners(limit = 10) {
  return useQuery({
    queryKey: STATS_KEYS.topEarners(limit),
    queryFn: () => statsApi.getTopEarners(limit),
    staleTime: 1000 * 60 * 3, // 3 minutos
  });
}

export function useTopStreaks(limit = 10) {
  return useQuery({
    queryKey: STATS_KEYS.topStreaks(limit),
    queryFn: () => statsApi.getTopStreaks(limit),
    staleTime: 1000 * 60 * 3,
  });
}

export function useHighestMultipliers(limit = 10) {
  return useQuery({
    queryKey: STATS_KEYS.highestMultipliers(limit),
    queryFn: () => statsApi.getHighestMultipliers(limit),
    staleTime: 1000 * 60 * 3,
  });
}

export function useMostActive(limit = 10) {
  return useQuery({
    queryKey: STATS_KEYS.mostActive(limit),
    queryFn: () => statsApi.getMostActive(limit),
    staleTime: 1000 * 60 * 3,
  });
}

export function useTopStakers(limit = 10) {
  return useQuery({
    queryKey: STATS_KEYS.topStakers(limit),
    queryFn: () => statsApi.getTopStakers(limit),
    staleTime: 1000 * 60 * 3,
  });
}

export function useGlobalStats() {
  return useQuery({
    queryKey: STATS_KEYS.global(),
    queryFn: statsApi.getGlobalStats,
    staleTime: 1000 * 60 * 10,
  });
}

export const STREAKS_KEYS = {
  all: ['stats'] as const,
  topActive: (limit: number) => [...STREAKS_KEYS.all, 'top-active', limit] as const,
};

export function useTopActiveStreaks(limit = 10) {
  return useQuery({
    queryKey: STREAKS_KEYS.topActive(limit),
    queryFn: () => statsApi.getTopActiveStreaks(limit),
    staleTime: 1000 * 60 * 2,
  });
}

export const CHAT_KEYS = {
  all: ['chat'] as const,
  topChatters: (limit: number) => [...CHAT_KEYS.all, 'top-chatters', limit] as const,
};

export function useTopChatters(limit = 10) {
  return useQuery({
    queryKey: CHAT_KEYS.topChatters(limit),
    queryFn: () => statsApi.getTopChatters(limit),
    staleTime: 1000 * 60 * 5,
  });
}

type AnyLeaderboardItem = LeaderboardUserStats | TopActiveStreakUser | TopChatterUser;
export function useSocialStats() {
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<LeaderboardCategory>('top-earners');
  const [limit, setLimit] = useState<number>(10);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [justLeveledUp, setJustLeveledUp] = useState<boolean>(false);

  const myStatsQuery = useMyStats();
  const globalStatsQuery = useGlobalStats();

  const getCategoryQueryKey = (cat: LeaderboardCategory, lim: number) => {
    switch (cat) {
      case 'top-earners': return STATS_KEYS.topEarners(lim);
      case 'top-streaks': return STATS_KEYS.topStreaks(lim);
      case 'highest-multipliers': return STATS_KEYS.highestMultipliers(lim);
      case 'most-active': return STATS_KEYS.mostActive(lim);
      case 'top-stakers': return STATS_KEYS.topStakers(lim);
      case 'top-active': return STREAKS_KEYS.topActive(lim);
      case 'top-chatters': return CHAT_KEYS.topChatters(lim);
      default: return STATS_KEYS.topEarners(lim);
    }
  };

  const getCategoryQueryFn = (cat: LeaderboardCategory, lim: number) => {
    switch (cat) {
      case 'top-earners': return () => statsApi.getTopEarners(lim);
      case 'top-streaks': return () => statsApi.getTopStreaks(lim);
      case 'highest-multipliers': return () => statsApi.getHighestMultipliers(lim);
      case 'most-active': return () => statsApi.getMostActive(lim);
      case 'top-stakers': return () => statsApi.getTopStakers(lim);
      case 'top-active': return () => statsApi.getTopActiveStreaks(lim);
      case 'top-chatters': return () => statsApi.getTopChatters(lim);
      default: return () => statsApi.getTopEarners(lim);
    }
  };

  const activeLeaderboardQuery = useQuery({
    queryKey: getCategoryQueryKey(activeCategory, limit),
    queryFn: getCategoryQueryFn(activeCategory, limit) as () => Promise<AnyLeaderboardItem[]>,
    staleTime: 1000 * 60 * 3,
  });

  const rawLeaderboardData = (activeLeaderboardQuery.data as AnyLeaderboardItem[]) || [];
  const userStats = myStatsQuery.data || null;
  const userMetrics = useMemo(() => {
    if (!userStats) return null;
    const winRate = userStats.totalBetsPlaced > 0
      ? ((userStats.totalBetsWon / userStats.totalBetsPlaced) * 100).toFixed(1)
      : '0.0';
    const netProfit = userStats.totalCoinsWon - userStats.totalCoinsStaked;
    const roi = userStats.totalCoinsStaked > 0
      ? (((userStats.totalCoinsWon - userStats.totalCoinsStaked) / userStats.totalCoinsStaked) * 100).toFixed(1)
      : '0.0';

    return {
      winRate: parseFloat(winRate),
      netProfit,
      roi: parseFloat(roi),
      isProfitable: netProfit >= 0,
    };
  }, [userStats]);

  const filteredLeaderboard = useMemo(() => {
    if (!searchQuery.trim()) return rawLeaderboardData;
    const q = searchQuery.toLowerCase();
    return rawLeaderboardData.filter((item: any) => {
      if (item.username?.toLowerCase().includes(q)) return true;
      if (item.name?.toLowerCase().includes(q)) return true;
      if (item.user?.username?.toLowerCase().includes(q)) return true;
      if (item.user?.name?.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [rawLeaderboardData, searchQuery]);

  const triggerDopamineWin = useCallback(() => {

    queryClient.invalidateQueries({ queryKey: STATS_KEYS.me() });

    setJustLeveledUp(true);
    setTimeout(() => setJustLeveledUp(false), 2500);
  }, [queryClient]);

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: STATS_KEYS.all }),
      queryClient.invalidateQueries({ queryKey: STREAKS_KEYS.all }),
      queryClient.invalidateQueries({ queryKey: CHAT_KEYS.all }),
    ]);
  };

  const isLoading = myStatsQuery.isLoading || activeLeaderboardQuery.isLoading;
  const isRefreshing = myStatsQuery.isFetching || activeLeaderboardQuery.isFetching;

  return {
    globalStats: globalStatsQuery.data || null,
    userStats,
    userMetrics,
    activeCategory,
    setActiveCategory,
    leaderboardData: filteredLeaderboard,
    rawLeaderboardData,
    isLoading,
    isRefreshing,
    limit,
    setLimit,
    searchQuery,
    setSearchQuery,
    handleRefresh,
    triggerDopamineWin,
    justLeveledUp,
  };
}