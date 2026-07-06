"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useGlobalSocket } from "@/context/SocketContext";
import { useUserStore } from "@/store/useUserStore"; 

export function usePollSocket(pollId: string) {
  const socket = useGlobalSocket();
  const { accessToken } = useUserStore(); 
  const [results, setResults] = useState<Record<string, string>>({});
  const [connected, setConnected] = useState(false);
  const lastVoteTime = useRef<number>(0);


  useEffect(() => {
    if (!socket) return;
    socket.auth = { ...socket.auth, token: accessToken };
  }, [socket, accessToken]);

  useEffect(() => {
    if (!socket) return;


    setConnected(socket.connected);

    const handleConnect = () => {
      setConnected(true);
      socket.emit("joinPoll", pollId);
    };

    const handleDisconnect = () => setConnected(false);

    const handleVotoActualizado = (updatedResults: Record<string, string>) => {
      setResults(updatedResults);
    };

    const handleWsError = (err: any) => {
      console.error("[Poll WS Error]:", err.message);
    };


    if (socket.connected) {
      socket.emit("joinPoll", pollId);
    }

    // Suscripciones a eventos globales del socket
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("votoActualizado", handleVotoActualizado);
    socket.on("ws-error", handleWsError);

    // Limpieza al desmontar el componente o cambiar de votación
    return () => {
      socket.emit("leavePoll", pollId); 
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("votoActualizado", handleVotoActualizado);
      socket.off("ws-error", handleWsError);
    };
  }, [socket, pollId]);

  const reconnect = useCallback(() => {
    if (!socket) return;
    

    const currentToken = useUserStore.getState().accessToken;
    socket.auth = { ...socket.auth, token: currentToken };
    

    socket.disconnect().connect();
  }, [socket]);

  const castVote = (optionId: number, userId: string, onResponse: (res: any) => void) => {
    const now = Date.now();

    if (now - lastVoteTime.current < 1000) return;

    if (!socket?.connected) {
      onResponse({ status: "error", message: "No estás conectado al servidor" });
      return;
    }

    lastVoteTime.current = now;

    socket.emit("castVote", { pollId, optionId, userId }, (response: any) => {
      onResponse(response);
    });
  };

  return { results, connected, castVote, reconnect };
}