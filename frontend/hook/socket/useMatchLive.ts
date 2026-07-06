import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useGlobalSocket } from '@/context/SocketContext';

export const useMatchSocket = (matchId: string) => {
  const socket = useGlobalSocket();
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    console.log(process.env.NEXT_PUBLIC_API_URL)

    if (!socket || !matchId) return;

    socket.emit('join_match', { matchId });

    const updateCache = (updater: (old: any) => any) => {
      queryClient.setQueryData(['match', matchId], updater);
    };

    const handleTimeUpdate = (payload: any) => {
      console.log('⏱️ match_time_update payload:', payload);
      updateCache((prev) => ({
        ...prev,
        score: { ...prev.score, elapsed: payload.elapsed ?? prev.score.elapsed },
        metadata: { ...prev.metadata, status: payload.status ?? prev.metadata.status }
      }));
    };

    const handleScoreUpdate = (payload: any) => {
      console.log('📊 score_changed payload:', payload);
      updateCache((prev) => ({
        ...prev,
        score: {
          ...prev.score,
          home: payload.home_goals ?? prev.score.home,
          away: payload.away_goals ?? prev.score.away,
          home_penalties: payload.home_penalty_goals ?? prev.score.home_penalties,
          away_penalties: payload.away_penalty_goals ?? prev.score.away_penalties,
          elapsed: payload.elapsed ?? prev.score.elapsed,
          summary: payload.eventsSummary ?? prev.score.summary
        },
        metadata: { ...prev.metadata, status: payload.status ?? prev.metadata.status }
      }));
    };

    const handleTimelineEventsUpdate = (payload: any) => {
      console.log('📅 timeline_updated payload:', payload)
      updateCache((prev) => {
        const apiEvent = payload.lastEvent;
        if (!apiEvent) return prev;
        const eventId = apiEvent.id || `${apiEvent.time?.elapsed}-${apiEvent.team?.id}-${apiEvent.type}`;

        if (prev.events?.some((e: any) => e.id === eventId)) return prev;

        const updatedEvents = [...(prev.events || []), { ...apiEvent, id: eventId }]
          .sort((a, b) => (b.minute || b.time?.elapsed || 0) - (a.minute || a.time?.elapsed || 0));

        return { ...prev, events: updatedEvents };
      });
    };

    const handleStatsUpdate = (payload: any) => {
      console.log('📈 stats_updated payload:', payload);
      updateCache((prev) => ({ ...prev, stats: payload.stats }));
    };

    const handleForceUpdate = () => {
      console.log("Forzando actualización por socket...");
      queryClient.invalidateQueries({ queryKey: ['match', matchId] });
    };



    socket.on('match_time_update', handleTimeUpdate);
    socket.on('score_changed', handleScoreUpdate);
    socket.on('timeline_updated', handleTimelineEventsUpdate);
    socket.on('stats_updated', handleStatsUpdate);

    socket.on('lineups_updated', handleForceUpdate);
    socket.on('match_ended', handleForceUpdate);

    return () => {
      socket.emit('leave_match', { matchId });
      socket.off('match_time_update', handleTimeUpdate);
      socket.off('score_changed', handleScoreUpdate);
      socket.off('timeline_updated', handleTimelineEventsUpdate);
      socket.off('stats_updated', handleStatsUpdate);
      socket.off('lineups_updated', handleForceUpdate);
      socket.off('match_ended', handleForceUpdate);
    };
  }, [socket, matchId, queryClient, router]);
};