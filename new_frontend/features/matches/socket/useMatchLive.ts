import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGlobalSocket } from '@/context/SocketContext';
import type { MatchDetails, MatchEvent, MatchLiveUpdatePayload, MatchStatus, StatsUpdatedPayload, TimelineUpdatedPayload } from '../types';

// El evento crudo de la API trae `time`, que no es parte del tipo de la app: se guarda con esa forma.
type RawTimelineEvent = MatchEvent & { time?: { elapsed?: number | null } };

export const useMatchLive = (leagueId: string, season: string, matchId: string) => {
  const socket = useGlobalSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !matchId) return;

    // Al reconectar, el socket ya no está en la sala: hay que volver a unirse.
    const joinMatch = () => socket.emit('join_match', { matchId });
    if (socket.connected) joinMatch();

    const queryKey = ['matchDetail', leagueId, season, matchId];

    const updateCache = (updater: (old: MatchDetails | undefined) => MatchDetails | undefined) => {
      queryClient.setQueryData<MatchDetails>(queryKey, updater);
    };

    const handleMatchLiveUpdate = (payload: MatchLiveUpdatePayload) => {
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
            status: (payload.status as MatchStatus) ?? prev.metadata.status,
          },
        };
      });
    };

    const handleTimelineEventsUpdate = (payload: TimelineUpdatedPayload) => {
      console.log('📅 timeline_updated payload:', payload);
      updateCache((prev) => {
        if (!prev) return prev;
        const apiEvent = payload.lastEvent as RawTimelineEvent | null;
        if (!apiEvent) return prev;
        
        const eventId = apiEvent.id || `${apiEvent.time?.elapsed}-${apiEvent.team?.id}-${apiEvent.type}`;
        if (prev.events?.some((e) => e.id === eventId)) return prev;
        
        const updatedEvents = ([...(prev.events || []), { ...apiEvent, id: eventId }] as RawTimelineEvent[]).sort(
          (a, b) => (b.minute || b.time?.elapsed || 0) - (a.minute || a.time?.elapsed || 0),
        );
        return { ...prev, events: updatedEvents };
      });
    };

    const handleStatsUpdate = (payload: StatsUpdatedPayload) => {
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

    const handleMatchDataUpdate = (payload: { type?: string }) => {
      if (payload.type === 'MATCH_ENDED') handleForceUpdate();
    };

    socket.on('connect', joinMatch);
    socket.on('match_live_update', handleMatchLiveUpdate);
    socket.on('timeline_updated', handleTimelineEventsUpdate);
    socket.on('stats_updated', handleStatsUpdate);
    socket.on('lineups_updated', handleForceUpdate);
    socket.on('match_data_update', handleMatchDataUpdate);

    return () => {
      socket.emit('leave_match', { matchId });
      socket.off('connect', joinMatch);
      socket.off('match_live_update', handleMatchLiveUpdate);
      socket.off('timeline_updated', handleTimelineEventsUpdate);
      socket.off('stats_updated', handleStatsUpdate);
      socket.off('lineups_updated', handleForceUpdate);
      socket.off('match_data_update', handleMatchDataUpdate);
    };
  }, [socket, leagueId, season, matchId, queryClient]);
};