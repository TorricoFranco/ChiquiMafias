"use client";

import { useEffect, useState } from "react";
import { useGlobalSocket } from "@/context/SocketContext";
import { useUserStore } from "@/store/useUserStore";

export interface MatchMessagePayload {
  messageId: string;
  matchId: string;
  userId: string;
  badgeUrl: string | null;
  name: string;
  teamName?: string | null;
  message: string;
  timestamp: number;
}

export const useMatchChat = (matchId: string) => {
  const socket = useGlobalSocket();
  const [messages, setMessages] = useState<MatchMessagePayload[]>([]);
  const { id: currentUserId } = useUserStore();
  const [timeoutUntil, setTimeoutUntil] = useState<number | null>(null);

  useEffect(() => {
    if (!socket || !currentUserId || !matchId) return;

    const checkMuteStatus = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/moderation/status/${currentUserId}`);
        const data = await res.json();
        if (data.isMuted) setTimeoutUntil(data.timeoutUntil);
      } catch (e) { 
        console.error("Error al verificar muteo", e); 
      }
    };
    checkMuteStatus();

    socket.emit("join_match", { matchId });


    const handleChatHistory = (history: MatchMessagePayload[]) => {
      setMessages(history);
    };

    const handleMessage = (msg: MatchMessagePayload) => {
      setMessages((prev) => [...prev, msg]);
    };

    const handleMessageDeleted = ({ messageId }: { messageId: string }) => {
      setMessages((prev) => prev.filter((msg) => msg.messageId !== messageId));
    };

    const handleTimeout = (payload: { userId: string; timeoutUntil: number }) => {
      if (payload.userId === currentUserId) setTimeoutUntil(payload.timeoutUntil);
    };

    const handleUnmuted = (payload: { userId: string }) => {
      if (payload.userId === currentUserId) setTimeoutUntil(null);
    };

    // SUSCRIPCIONES
    socket.on("match_chat_history", handleChatHistory);
    socket.on("on-message", handleMessage); // Ajustado a 'on-message' por consistencia con el backend
    socket.on("on_message_deleted", handleMessageDeleted);
    socket.on("user-timeout", handleTimeout);
    socket.on("user-unmuted", handleUnmuted);

    return () => {
      socket.off("match_chat_history", handleChatHistory);
      socket.off("on-message", handleMessage);
      socket.off("on_message_deleted", handleMessageDeleted);
      socket.off("user-timeout", handleTimeout);
      socket.off("user-unmuted", handleUnmuted);
    };
  }, [socket, matchId, currentUserId]);

  const sendMessage = (message: string) => {
    if (socket?.connected) {
      socket.emit("send_chat_message", { matchId, message });
    } else {
      console.warn("Socket desconectado");
    }
  };

  const deleteMessage = (messageId: string) => {
    if (socket?.connected) {
      socket.emit("delete_message", { matchId, messageId });
    }
  };

  return { messages, sendMessage, deleteMessage, timeoutUntil, setTimeoutUntil };
};