import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { statsApi } from '../api/statsApi';
import {
  LeaderboardUserStats,
  TopActiveStreakUser,
  TopChatterUser,
  LeaderboardCategory,
} from '../types/';

export const STATS_KEYS = {
  all: ['stats'] as const,
  topEarners: (limit: number) => [...STATS_KEYS.all, 'top-earners', limit] as const,
  topStreaks: (limit: number) => [...STATS_KEYS.all, 'top-streaks', limit] as const,
  highestMultipliers: (limit: number) => [...STATS_KEYS.all, 'highest-multipliers', limit] as const,
  mostActive: (limit: number) => [...STATS_KEYS.all, 'most-active', limit] as const,
  topStakers: (limit: number) => [...STATS_KEYS.all, 'top-stakers', limit] as const,
  global: () => [...STATS_KEYS.all, 'global'] as const,
};

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

type SearchableLeaderboardItem = {
  username?: string | null;
  user?: { username?: string | null } | null;
};
export function useSocialStats() {
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<LeaderboardCategory>('top-earners');
  const [limit, setLimit] = useState<number>(10);
  const [searchQuery, setSearchQuery] = useState<string>('');

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
  const filteredLeaderboard = useMemo(() => {
    if (!searchQuery.trim()) return rawLeaderboardData;
    const q = searchQuery.toLowerCase();
    // Cada leaderboard trae un shape distinto: la búsqueda lee estos campos opcionales de cualquiera de ellos.
    return rawLeaderboardData.filter((raw) => {
      const item = raw as SearchableLeaderboardItem;
      if (item.username?.toLowerCase().includes(q)) return true;
      if (item.user?.username?.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [rawLeaderboardData, searchQuery]);

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: STATS_KEYS.all }),
      queryClient.invalidateQueries({ queryKey: STREAKS_KEYS.all }),
      queryClient.invalidateQueries({ queryKey: CHAT_KEYS.all }),
    ]);
  };

  const isLoading = activeLeaderboardQuery.isLoading;
  const isRefreshing = activeLeaderboardQuery.isFetching;

  return {
    globalStats: globalStatsQuery.data || null,
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
  };
}