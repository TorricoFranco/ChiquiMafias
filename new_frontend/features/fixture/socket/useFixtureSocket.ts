import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueries } from '@tanstack/react-query';
import { useUserStore } from '@/store/useUserStore';
import { liveScoresQuery } from '../hooks/useFixture';
import { formatToMapFixtureSocket } from '../utils/formatToMapFixtureSocket';
import { FINAL_STATUSES, LIVE_STATUSES } from '../utils/liveStatus';
import type { GetLiveScoresResponse, LeagueLiveUpdate, LiveResult } from '../types';

// Fuera del hook: con una referencia estable, useQueries solo vuelve a combinar si cambian los datos.
const combineLiveScores = (results: { data?: GetLiveScoresResponse[]; isLoading: boolean }[]) => ({
  // Se mezcla lo que va llegando: si una competición falla, las demás no pierden su vivo.
  data: results.some((r) => r.data) ? results.flatMap((r) => r.data ?? []) : undefined,
  // Solo la principal: la Liga no espera los reintentos de la Copa.
  isLoading: results[0]?.isLoading ?? false,
});

/**
 * Marcadores en vivo de varias competiciones (Social sigue la Liga y la Copa a
 * la vez): los iniciales por REST y después por un solo socket. La primera de
 * `slugs` es la principal: solo esa cuenta para `isLoading`.
 */
export const useCompetitionsLive = (slugs: string[]) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { accessToken } = useUserStore();
  // Clave estable para el efecto: el array puede ser otro en cada render.
  const slugsKey = slugs.join(',');

  const { data: initialLive, isLoading } = useQueries({
    queries: slugs.map(liveScoresQuery),
    combine: combineLiveScores,
  });
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
    const rooms = slugsKey ? slugsKey.split(',') : [];
    if (rooms.length === 0) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

    const wsSocket = io(apiUrl, {
      auth: { token: accessToken },
      transports: ["websocket"],
      reconnection: true,
      autoConnect: true,
    });

    wsSocket.on("connect", () => {
      console.log(`✅ Conectado al socket de ligas`);
      for (const slug of rooms) {
        // El backend responde `{ status: 'ok' }` o el error (competición inexistente).
        wsSocket.emit('join_competition', { slug }, (res?: { status?: string; code?: string; message?: string }) => {
          if (res?.status && res.status !== 'ok') {
            console.warn(`No se pudo seguir en vivo "${slug}": ${res.message ?? res.code ?? 'error desconocido'}`);
          }
        });
      }
    });

    wsSocket.on("disconnect", () => {
      console.log(`❌ Desconectado del socket de ligas`);
    });

    // eslint-disable-next-line react-hooks/set-state-in-effect -- el socket es un recurso externo: su instancia tiene que quedar en estado
    setSocket(wsSocket);

    return () => {
      if (wsSocket.connected) {
        for (const slug of rooms) wsSocket.emit('leave_competition', { slug });
      }
      wsSocket.disconnect();
    };
  }, [accessToken, slugsKey]);

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
          // Un partido que terminó también llega por acá, una última vez, con su resultado final.
          isLive: LIVE_STATUSES.includes(live.status),
          isPlayoff: !!live.isPlayoff,
          elapsed: live.elapsed,
          // El primer aviso con el final marca el momento; los siguientes no lo corren.
          finishedAt: FINAL_STATUSES.includes(live.status) ? (prev[id]?.finishedAt ?? Date.now()) : undefined,
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

/** Marcadores en vivo de una competición: los iniciales por REST y después por socket. */
export const useLeagueLive = (slug: string) => useCompetitionsLive([slug]);
