"use client";

import { useEffect, useState } from "react";
import { useGlobalSocket } from "@/context/SocketContext";
import { useUserStore } from "@/store/useUserStore";
import { apiFetch } from "@/lib/apiFetch";
import { ActivePollMessage } from "@/features/polls/types";

export interface ChatMessagePayload {
  messageId: string;
  userId: string;
  badgeUrl: string | null;
  name: string;
  teamName?: string | null;
  message: string;
  timestamp: number;
  stickerId?: string | null;
  chatBubbleId?: string;
  nameColor?: string;
  bannerId?: string;
  isMegaphone?: boolean;
  tier?: string | null;
  role?: string | null;
}

export interface PinnedMegaphone {
  name: string;
  message: string;
  timestamp: number;
}

export interface SubscriptionGiftPayload {
  tier: string;
  gifts: {
    coins?: number;
    cosmetics: { assetId: string; quantity: number }[];
    showAnimation: boolean;
  };
}

export function useChatSocket() {
  const socket = useGlobalSocket();
  const [messages, setMessages] = useState<ChatMessagePayload[]>([]);
  const [connected, setConnected] = useState(false);
  const { id: currentUserId } = useUserStore();
  const [timeoutUntil, setTimeoutUntil] = useState<number | null>(null);

  const [activeMegaphone, setActiveMegaphone] = useState<PinnedMegaphone | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [activePoll, setActivePoll] = useState<ActivePollMessage | null>(null);
  const [pendingGifts, setPendingGifts] = useState<SubscriptionGiftPayload | null>(null);

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

    const handleMegaphoneShow = (payload: any) => {
      setActiveMegaphone({
        name: payload.name,
        message: payload.message,
        timestamp: payload.timestamp || Date.now(),
      });
    };

    const handleMegaphoneQueued = (payload: { position: number }) => {
      setQueuePosition(payload.position);
      setTimeout(() => setQueuePosition(null), 5000);
    };

    const handleWsException = (payload: any) => {
      if (payload?.code === "RATE_LIMIT" && payload?.data?.retryIn) {
        const penaltySeconds = payload.data.retryIn;
        const newTimeout = Date.now() + penaltySeconds * 1000;

        setTimeoutUntil((prev) => {
          if (prev && prev > newTimeout) return prev;
          return newTimeout;
        });
      }
    };

    const handlePollShow = (payload: any) => {
      setActivePoll({
        id: payload.id,
        title: payload.title,
        timestamp: payload.timestamp || Date.now(),
      });
    };

    const handleSubscriptionGift = (payload: SubscriptionGiftPayload) => {
      setPendingGifts(payload);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("on-message", handleOnMessage);
    socket.on("global_chat_history", handleGlobalHistory);
    socket.on("on_message_deleted", handleMessageDeleted);
    socket.on("user-timeout", handleUserTimeout);
    socket.on("user-unmuted", handleUserUnmuted);
    socket.on("ws-error", handleWsException);
    socket.on("megaphone_show", handleMegaphoneShow);
    socket.on("megaphone_queued", handleMegaphoneQueued);
    socket.on("poll_show", handlePollShow);
    socket.on("subscription_gift_received", handleSubscriptionGift);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("on-message", handleOnMessage);
      socket.off("global_chat_history", handleGlobalHistory);
      socket.off("on_message_deleted", handleMessageDeleted);
      socket.off("user-timeout", handleUserTimeout);
      socket.off("user-unmuted", handleUserUnmuted);
      socket.off("ws-error", handleWsException);
      socket.off("megaphone_show", handleMegaphoneShow);
      socket.off("megaphone_queued", handleMegaphoneQueued);
      socket.off("poll_show", handlePollShow);
      socket.off("subscription_gift_received", handleSubscriptionGift);
    };
  }, [socket, currentUserId]);

  const sendMessage = (
    body: string,
    stickerId: string | null = null,
    useMegaphone: boolean = false
  ) => {
    if (socket?.connected) {
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
    setTimeoutUntil,
    activeMegaphone,
    setActiveMegaphone,
    queuePosition,
    activePoll,
    setActivePoll,
    pendingGifts,
    setPendingGifts,
  };
}