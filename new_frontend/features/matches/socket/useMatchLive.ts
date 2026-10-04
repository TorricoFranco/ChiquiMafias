import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGlobalSocket } from '@/context/SocketContext';

export const useMatchLive = (leagueId: string, season: string, matchId: string) => {
  const socket = useGlobalSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !matchId) return;

    socket.emit('join_match', { matchId });

    const queryKey = ['matchDetail', leagueId, season, matchId];

    const updateCache = (updater: (old: any) => any) => {
      queryClient.setQueryData(queryKey, updater);
    };

    const handleMatchLiveUpdate = (payload: any) => {
      console.log('⚽ match_live_update payload:', payload);
      updateCache((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          score: {
            ...prev.score,
            home: payload.h ?? prev.score.home,
            away: payload.a ?? prev.score.away,
            elapsed: payload.elapsed ?? prev.score.elapsed,
          },
          metadata: {
            ...prev.metadata,
            status: payload.status ?? prev.metadata.status,
          },
        };
      });
    };

    const handleTimelineEventsUpdate = (payload: any) => {
      console.log('📅 timeline_updated payload:', payload);
      updateCache((prev) => {
        if (!prev) return prev;
        const apiEvent = payload.lastEvent;
        if (!apiEvent) return prev;
        
        const eventId = apiEvent.id || `${apiEvent.time?.elapsed}-${apiEvent.team?.id}-${apiEvent.type}`;
        if (prev.events?.some((e: any) => e.id === eventId)) return prev;
        
        const updatedEvents = [...(prev.events || []), { ...apiEvent, id: eventId }].sort(
          (a, b) => (b.minute || b.time?.elapsed || 0) - (a.minute || a.time?.elapsed || 0),
        );
        return { ...prev, events: updatedEvents };
      });
    };

    const handleStatsUpdate = (payload: any) => {
      console.log('📈 stats_updated payload:', payload);
      updateCache((prev) => {
        if (!prev) return prev;
        return { ...prev, stats: payload.stats };
      });
    };

    const handleForceUpdate = () => {
      console.log('Forzando actualización por socket...');
      queryClient.invalidateQueries({ queryKey });
    };

    socket.on('match_live_update', handleMatchLiveUpdate);
    socket.on('timeline_updated', handleTimelineEventsUpdate);
    socket.on('stats_updated', handleStatsUpdate);
    socket.on('lineups_updated', handleForceUpdate);
    

    socket.on('match_data_update', (payload) => {
        if(payload.type === 'MATCH_ENDED') handleForceUpdate();
    });

    return () => {
      socket.emit('leave_match', { matchId });
      socket.off('match_live_update', handleMatchLiveUpdate);
      socket.off('timeline_updated', handleTimelineEventsUpdate);
      socket.off('stats_updated', handleStatsUpdate);
      socket.off('lineups_updated', handleForceUpdate);
      socket.off('match_data_update');
    };
  }, [socket, leagueId, season, matchId, queryClient]);
};