"use client";

import { useEffect, useState } from "react";
import { useGlobalSocket } from "@/context/SocketContext";
import { useUserStore } from "@/store/useUserStore";
import { apiFetch } from "@/lib/apiFetch";

export interface ChatMessagePayload {
  messageId: string;
  userId: string;
  badgeUrl: string | null;
  name: string;
  teamName?: string | null;
  message: string;
  timestamp: number;
  // 🔥 Agregamos las propiedades cosméticas y de mensajería para tipar correctamente
  stickerId?: string | null;
  nameColor?: string;
  bannerId?: string;
  isMegaphone?: boolean;
}

export function useChatSocket() {
  const socket = useGlobalSocket();
  const [messages, setMessages] = useState<ChatMessagePayload[]>([]);
  const [connected, setConnected] = useState(false);
  const { id: currentUserId } = useUserStore();
  const [timeoutUntil, setTimeoutUntil] = useState<number | null>(null);

  useEffect(() => {
    if (!currentUserId) {
      setMessages([]);
      setTimeoutUntil(null);
    }

    if (!socket) return;

    setConnected(socket.connected);

    const checkMuteStatus = async () => {
      if (!currentUserId) return;
      try {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/moderation/status/${currentUserId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.isMuted) setTimeoutUntil(data.timeoutUntil);
        }
      } catch (e) {
        console.error("Error consultando estado de muteo", e);
      }
    };

    checkMuteStatus();

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);
    const handleOnMessage = (msg: ChatMessagePayload) => setMessages((prev) => [...prev, msg]);
    const handleGlobalHistory = (history: ChatMessagePayload[]) => setMessages(history);
    const handleMessageDeleted = ({ messageId }: { messageId: string }) => {
      setMessages((prev) => prev.filter((msg) => msg.messageId !== messageId));
    };
    const handleUserTimeout = (payload: { userId: string; timeoutUntil: number }) => {
      if (payload.userId === currentUserId) setTimeoutUntil(payload.timeoutUntil);
    };
    const handleUserUnmuted = (payload: { userId: string }) => {
      if (payload.userId === currentUserId) setTimeoutUntil(null);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("on-message", handleOnMessage);
    socket.on("global_chat_history", handleGlobalHistory);
    socket.on("on_message_deleted", handleMessageDeleted);
    socket.on("user-timeout", handleUserTimeout);
    socket.on("user-unmuted", handleUserUnmuted);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("on-message", handleOnMessage);
      socket.off("global_chat_history", handleGlobalHistory);
      socket.off("on_message_deleted", handleMessageDeleted);
      socket.off("user-timeout", handleUserTimeout);
      socket.off("user-unmuted", handleUserUnmuted);
    };
  }, [socket, currentUserId]);

  // 🔥 ACTUALIZADO: Ahora acepta los parámetros necesarios para stickers y megáfonos
  const sendMessage = (
    body: string,
    stickerId: string | null = null,
    useMegaphone: boolean = false
  ) => {
    if (socket?.connected) {
      // Enviamos el objeto completo mapeado con lo que espera el SendMessageDto del backend
      socket.emit("send-message", {
        body,
        stickerId,
        useMegaphone
      });
    } else {
      console.warn("No se pudo enviar el mensaje: Socket desconectado");
    }
  };

  const deleteMessage = (messageId: string) => {
    if (socket?.connected) {
      socket.emit("delete_message", { messageId });
    }
  };

  return {
    messages,
    connected,
    sendMessage,
    deleteMessage,
    timeoutUntil,
    setTimeoutUntil
  };
}