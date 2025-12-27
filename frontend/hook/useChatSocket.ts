"use client";

import { useEffect, useRef, useState } from "react";
import { connectSocket } from "@/services/socket";
import { ChatMessagesProps } from "@/types/messages";
import { Socket } from "socket.io-client";

export function useChatSocket() {
  const socketRef = useRef<Socket | null>(null);

  const [messages, setMessages] = useState<ChatMessagesProps[]>([]);
  const [connected, setConnected] = useState(false);

  const connect = () => {
    const token = localStorage.getItem("token");

    // 1. Si ya existe un socket, lo matamos completamente
    if (socketRef.current) {
      socketRef.current.removeAllListeners(); // Limpiamos eventos viejos
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // 2. Creamos la conexión nueva
    // Es vital que tu función connectSocket use el token en la propiedad 'auth'
    socketRef.current = connectSocket(token ?? undefined);

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Socket Conectado con ID:", socket.id);
      setConnected(true);
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("on-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    // IMPORTANTE: Escuchar errores de conexión (auth errors)
    socket.on("connect_error", (err) => {
      console.error("Error de conexión (posible token vencido):", err.message);
    });
  };
  
  useEffect(() => {
    connect();

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const sendMessage = (body: string) => {
    if (!socketRef.current || !connected) return;
    socketRef.current.emit("send-message", { body });
  };

  return {
    messages,
    connected,
    sendMessage,
    reconnect: connect,
  };
}
