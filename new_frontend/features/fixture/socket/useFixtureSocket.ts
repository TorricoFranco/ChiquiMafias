import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useUserStore } from '@/store/useUserStore';
import { useLiveScores } from '../hooks/useFixture';
import { formatToMapFixtureSocket } from '../utils/formatToMapFixtureSocket';
import type { LeagueLiveUpdate, LiveResult } from '../types';

/** Marcadores en vivo de una competición: los iniciales por REST y después por socket. */
export const useLeagueLive = (slug: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { accessToken } = useUserStore(); 

  const { data: initialLive, isLoading } = useLiveScores(slug);
  const [liveResults, setLiveResults] = useState<Record<string, LiveResult>>(() =>
    initialLive ? formatToMapFixtureSocket(initialLive) : {}
  );

  // Al llegar las live scores iniciales se mezclan sin pisar lo que ya llegó por socket. Se ajusta durante el render, sin efecto.
  const [prevInitialLive, setPrevInitialLive] = useState(initialLive);
  if (initialLive !== prevInitialLive) {
    setPrevInitialLive(initialLive);
    if (initialLive) {
      setLiveResults((prev) => ({
        ...formatToMapFixtureSocket(initialLive),
        ...prev
      }));
    }
  }

  useEffect(() => {
    if (!slug) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

    const wsSocket = io(apiUrl, {
      auth: { token: accessToken },
      transports: ["websocket"],
      reconnection: true,
      autoConnect: true,
    });

    wsSocket.on("connect", () => {
      console.log(`✅ Conectado al socket de ligas`);
      wsSocket.emit('join_competition', { slug });
    });

    wsSocket.on("disconnect", () => {
      console.log(`❌ Desconectado del socket de ligas`);
    });

    // eslint-disable-next-line react-hooks/set-state-in-effect -- el socket es un recurso externo: su instancia tiene que quedar en estado
    setSocket(wsSocket);

    return () => {
      if (wsSocket.connected) {
        wsSocket.emit('leave_competition', { slug });
      }
      wsSocket.disconnect();
    };
  }, [accessToken, slug]);

  const handleLeagueUpdate = useCallback((matches: Record<string, LeagueLiveUpdate>) => {
    console.log('🏆 on_league_update payload:', matches); 

    setLiveResults((prev) => {
      const newUpdates: Record<string, LiveResult> = {};

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
    if (!socket) return;

    socket.on('on_league_update', handleLeagueUpdate);

    return () => {
      socket.off('on_league_update', handleLeagueUpdate);
    };
  }, [socket, handleLeagueUpdate]);

  return { liveResults, isLoading };
};