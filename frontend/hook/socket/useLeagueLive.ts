import { useEffect, useState, useCallback } from 'react';
import { useGlobalSocket } from '@/context/SocketContext';
import { useLiveScores } from '../react-query/useLiveScore';
import { formatToMap } from '@/app/utils/formatToMap';
import { LiveResultsMap } from '@/types/liveMatchUpdate';
import { LeagueLiveScore } from '@/types/socketEvents';

export const useLeagueLive = (leagueId: string) => {
  const socket = useGlobalSocket();
  const { data: initialLive, isLoading } = useLiveScores();

  const [liveResults, setLiveResults] = useState<LiveResultsMap>(() =>
    initialLive ? formatToMap(initialLive) : {}
  );

  useEffect(() => {
    if (initialLive) {
      setLiveResults(prev => {
        const baseData = formatToMap(initialLive);
        return { ...baseData, ...prev };
      });
    }
  }, [initialLive]);

  const handleLeagueUpdate = useCallback((matches: Record<string, LeagueLiveScore>) => {
    console.log('⚽ on_league_update payload:', matches);
    setLiveResults((prev) => {
      const newUpdates: LiveResultsMap = {};

      Object.entries(matches).forEach(([id, live]) => {
        newUpdates[id] = {
          h: Number(live.h),
          a: Number(live.a),
          hp: Number(live.hp || 0),
          ap: Number(live.ap || 0),
          homeTeamId: live.homeTeamId,
          awayTeamId: live.awayTeamId,
          status: live.status,
          isLive: true,
          isPlayoff: !!live.isPlayoff,
          elapsed: live.elapsed
        };
      });

      return { ...prev, ...newUpdates };
    });
  }, []);

  useEffect(() => {
    if (!socket || !leagueId) return;

    socket.emit('join_league', { leagueId });
    socket.on('on_league_update', handleLeagueUpdate);

    return () => {
      socket.emit('leave_league', { leagueId });
      socket.off('on_league_update', handleLeagueUpdate);
    };
  }, [socket, leagueId, handleLeagueUpdate]);

  return { liveResults, isLoading };
};