import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useUserStore } from '@/store/useUserStore';
import { useLiveScores } from '../hooks/useFixture';
import { formatToMapFixtureSocket } from '../utils/formatToMapFixtureSocket';

export const useLeagueLive = (leagueId: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { accessToken } = useUserStore(); 

  const { data: initialLive, isLoading } = useLiveScores();
  const [liveResults, setLiveResults] = useState<Record<string, any>>(() =>
    initialLive ? formatToMapFixtureSocket(initialLive) : {}
  );

  useEffect(() => {
    if (initialLive) {
      setLiveResults((prev) => ({
        ...formatToMapFixtureSocket(initialLive),
        ...prev
      }));
    }
  }, [initialLive]);

  useEffect(() => {
    if (!leagueId) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

    const wsSocket = io(apiUrl, {
      auth: { token: accessToken },
      transports: ["websocket"],
      reconnection: true,
      autoConnect: true,
    });

    wsSocket.on("connect", () => {
      console.log(`✅ Conectado al socket de ligas`);
      wsSocket.emit('join_league', { leagueId });
    });

    wsSocket.on("disconnect", () => {
      console.log(`❌ Desconectado del socket de ligas`);
    });

    setSocket(wsSocket);

    return () => {
      if (wsSocket.connected) {
        wsSocket.emit('leave_league', { leagueId });
      }
      wsSocket.disconnect();
    };
  }, [accessToken, leagueId]);

  const handleLeagueUpdate = useCallback((matches: Record<string, any>) => {
    console.log('🏆 on_league_update payload:', matches); 

    setLiveResults((prev) => {
      const newUpdates: Record<string, any> = {};

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