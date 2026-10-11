"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useGlobalSocket } from "@/context/SocketContext";
import type { PollOption, PollRankingResults, VoteAck } from "@/features/polls/types";

/** Payload del evento global de error del socket. */
interface WsErrorPayload {
  message?: string;
}

export function usePollSocket(pollId: string, initialOptions: PollOption[] = []) {
  const socket = useGlobalSocket();

  const [results, setResults] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    initialOptions.forEach((opt) => {
      if (opt.id !== undefined) {
        initial[opt.id.toString()] = (opt.votes || 0).toString();
      }
    });
    return initial;
  });

  /** Total de votantes en vivo. Es lo único que recibe quien todavía no votó. */
  const [liveTotal, setLiveTotal] = useState<number | null>(null);
  /** Matriz de posiciones del podio, solo para los que ya votaron. */
  const [rankingResults, setRankingResults] = useState<PollRankingResults | null>(null);
  const lastVoteTime = useRef<number>(0);

  // El estado de la conexión es del socket, no de React: se lee de ahí en vez
  // de copiarlo a un useState desde un efecto.
  const connected = useSyncExternalStore(
    useCallback(
      (onStoreChange: () => void) => {
        if (!socket) return () => {};

        socket.on("connect", onStoreChange);
        socket.on("disconnect", onStoreChange);

        return () => {
          socket.off("connect", onStoreChange);
          socket.off("disconnect", onStoreChange);
        };
      },
      [socket],
    ),
    () => socket?.connected ?? false,
    () => false,
  );

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      socket.emit("joinPoll", { pollId: pollId });
    };

    const handleVotoActualizado = (updatedResults: Record<string, string>) => {
      setResults(updatedResults);
    };

    const handleTotalActualizado = ({ totalVotes }: { totalVotes: number }) => {
      setLiveTotal(totalVotes);
    };

    const handleRankingActualizado = (matrix: PollRankingResults) => {
      setRankingResults(matrix);
    };

    const handleWsError = (err: WsErrorPayload) => {
      console.error("[Poll WS Error]:", err?.message);
    };

    if (socket.connected) {
      socket.emit("joinPoll", { pollId: pollId });
    }

    const eventoVoto = `votoActualizado_${pollId}`;
    const eventoTotal = `totalActualizado_${pollId}`;
    const eventoRanking = `rankingActualizado_${pollId}`;

    socket.on("connect", handleConnect);
    socket.on(eventoVoto, handleVotoActualizado);
    socket.on(eventoTotal, handleTotalActualizado);
    socket.on(eventoRanking, handleRankingActualizado);
    socket.on("ws-error", handleWsError);

    return () => {
      socket.emit("leavePoll", { pollId: pollId });
      socket.off("connect", handleConnect);
      socket.off(eventoVoto, handleVotoActualizado);
      socket.off(eventoTotal, handleTotalActualizado);
      socket.off(eventoRanking, handleRankingActualizado);
      socket.off("ws-error", handleWsError);
    };
  }, [socket, pollId]);

  /** Devuelve false si el voto no llegó a salir (throttle), para que el llamador no quede esperando un ack. */
  const castVote = (optionId: number, userId: string, onResponse: (res: VoteAck) => void) => {
    const now = Date.now();

    if (now - lastVoteTime.current < 1000) return false;

    if (!socket?.connected) {
      onResponse({ status: "error", message: "No estás conectado al servidor" });
      return true;
    }

    lastVoteTime.current = now;

    socket.emit("castVote", { pollId, optionId, userId }, (response: VoteAck) => {
      onResponse(response);
    });

    return true;
  };

  /** Voto del podio: manda la lista ordenada en vez de una sola opción. */
  const castRanking = (ranking: number[], userId: string, onResponse: (res: VoteAck) => void) => {
    const now = Date.now();

    if (now - lastVoteTime.current < 1000) return false;

    if (!socket?.connected) {
      onResponse({ status: "error", message: "No estás conectado al servidor" });
      return true;
    }

    lastVoteTime.current = now;

    socket.emit("castVote", { pollId, ranking, userId }, (response: VoteAck) => {
      onResponse(response);
    });

    return true;
  };

  return { results, connected, liveTotal, rankingResults, castVote, castRanking };
}
