// hook/usePollSocket.ts
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { connectSocket } from "@/services/socket";
import { Socket } from "socket.io-client";

export function usePollSocket(pollId: string) {
  const socketRef = useRef<Socket | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});
  const [connected, setConnected] = useState(false);
  const lastVoteTime = useRef<number>(0);

  const connect = useCallback(() => {
    const token = localStorage.getItem("token");

    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    socketRef.current = connectSocket(token ?? undefined);
    const socket = socketRef.current;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("joinPoll", pollId);
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("votoActualizado", (updatedResults: Record<string, string>) => {
      setResults(updatedResults);
    });

    // Escucha genérica de errores para logs o notificaciones globales
    socket.on("ws-error", (err) => {
      console.error("[WS Global Error]:", err.message);
    });

    socket.on("connect_error", (err) => {
      console.error("Error de conexión:", err.message);
    });
  }, [pollId]);

  useEffect(() => {
    connect();
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [connect]);

  const castVote = (optionId: number, userId: string, onResponse: (res: any) => void) => {
    const now = Date.now();
    if (now - lastVoteTime.current < 1000) return;
    lastVoteTime.current = now;

    if (!socketRef.current?.connected) {
      onResponse({ status: "error", message: "No estás conectado al servidor" });
      return;
    }

    // Emitimos y el tercer parámetro es lo que recibirá el 'ack' del filtro del server
    socketRef.current.emit("castVote", { pollId, optionId, userId }, (response: any) => {
      onResponse(response);
    });
  };

  return { results, connected, castVote, reconnect: connect };
}