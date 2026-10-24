import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGlobalSocket } from '@/context/SocketContext';
import { chatStateFor } from '../types';
import { matchDetailKey } from '../hooks/useMatchDetails';
import type { MatchDetails, MatchLiveUpdatePayload, MatchStatus, StatsUpdatedPayload, TimelineUpdatedPayload } from '../types';

export const useMatchLive = (matchId: string) => {
  const socket = useGlobalSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !matchId) return;

    // Al reconectar, el socket ya no está en la sala: hay que volver a unirse.
    const joinMatch = () => socket.emit('join_match', { matchId });
    if (socket.connected) joinMatch();

    const queryKey = matchDetailKey(matchId);

    const updateCache = (updater: (old: MatchDetails | undefined) => MatchDetails | undefined) => {
      queryClient.setQueryData<MatchDetails>(queryKey, updater);
    };

    // El socket compartido puede estar en salas de otros partidos: solo cuenta
    // lo que es de este.
    const isThisMatch = (payload: { matchId?: string }) => payload?.matchId === matchId;

    const handleMatchLiveUpdate = (payload: MatchLiveUpdatePayload) => {
      if (!isThisMatch(payload)) return;
      console.log('⚽ match_live_update payload:', payload);
      updateCache((prev) => {
        if (!prev) return prev;
        const chatState = payload.chatState ?? chatStateFor(payload.status ?? prev.metadata.status);
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
          // El chat se abre, se pausa o se cierra en vivo, sin recargar.
          chatState,
          chatActive: chatState === 'OPEN',
        };
      });
    };

    // El evento del socket es el crudo del proveedor (`time.elapsed`, ids de equipo y
    // jugador del proveedor): no sirve para la cronología, que usa los ids propios y
    // `minute`. Además los goleadores del marcador (`score.summary`) los arma el backend
    // a partir de los eventos. Se recarga el detalle, que trae las dos cosas.
    const handleTimelineEventsUpdate = (payload: TimelineUpdatedPayload) => {
      if (!isThisMatch(payload)) return;
      queryClient.invalidateQueries({ queryKey });
    };

    // El aviso del backend no trae las estadísticas (llega `stats` sin definir) y los ids de equipo
    // que manda son los del proveedor: pisar la caché con eso borraba el bloque de estadísticas del
    // partido. Se recarga el detalle, que ya las trae con los ids propios.
    const handleStatsUpdate = (payload: StatsUpdatedPayload) => {
      if (!isThisMatch(payload)) return;
      queryClient.invalidateQueries({ queryKey });
    };

    const handleForceUpdate = () => {
      console.log('Forzando actualización por socket...');
      queryClient.invalidateQueries({ queryKey });
    };

    const handleMatchDataUpdate = (payload: { matchId?: string; type?: string }) => {
      if (!isThisMatch(payload)) return;
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
  }, [socket, matchId, queryClient]);
};