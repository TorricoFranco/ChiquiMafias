"use client";

import { useEffect, useState } from "react";
import { useGlobalSocket } from "@/context/SocketContext";
import { useUserStore } from "@/store/useUserStore";
import { apiFetch } from "@/lib/apiFetch";

export interface MatchChatMessagePayload {
    messageId: string;
    matchId: string;
    userId: string;
    badgeUrl: string | null;
    name: string;
    teamName?: string | null;
    message: string;
    timestamp: number;
    stickerId?: string | null;
    chatBubbleId?: string;
    nameColor?: string;
    isMegaphone?: boolean;
    tier?: string | null;
    role?: string | null;
}

export interface PinnedMatchMegaphone {
    name: string;
    message: string;
    timestamp: number;
}

export function useMatchSocket(matchId: string) {
    const socket = useGlobalSocket();
    const [messages, setMessages] = useState<MatchChatMessagePayload[]>([]);
    const [connected, setConnected] = useState(false);
    const { id: currentUserId } = useUserStore();
    const [timeoutUntil, setTimeoutUntil] = useState<number | null>(null);

    const [activeMegaphone, setActiveMegaphone] = useState<PinnedMatchMegaphone | null>(null);
    const [queuePosition, setQueuePosition] = useState<number | null>(null);

    const [liveData, setLiveData] = useState<any>(null);
    const [matchStats, setMatchStats] = useState<any>(null);
    const [latestGoal, setLatestGoal] = useState<any>(null);

    useEffect(() => {
        if (!currentUserId || !matchId) {
            setMessages([]);
            setTimeoutUntil(null);
            return;
        }

        if (!socket) return;

        setConnected(socket.connected);

        const checkMuteStatus = async () => {
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

        socket.emit('join_match', { matchId });

        const handleConnect = () => {
            setConnected(true);
            socket.emit('join_match', { matchId });
        };
        const handleDisconnect = () => setConnected(false);

        const handleMatchHistory = (history: MatchChatMessagePayload[]) => setMessages(history);

        const handleOnMessage = (msg: MatchChatMessagePayload) => {
            setMessages((prev) => [...prev, msg]);
        };

        const handleMessageDeleted = ({ messageId }: { messageId: string }) => {
            setMessages((prev) => prev.filter((msg) => msg.messageId !== messageId));
        };

        const handleMegaphoneQueued = (payload: { position: number }) => {
            setQueuePosition(payload.position);
            setTimeout(() => setQueuePosition(null), 5000);
        };
        const handleMegaphoneShow = (payload: any) => {
            setActiveMegaphone({
                name: payload.name,
                message: payload.message,
                timestamp: payload.timestamp || Date.now(),
            });
        };

        const handleMatchLiveUpdate = (payload: any) => setLiveData(payload);
        const handleStatsUpdated = (payload: any) => setMatchStats(payload);
        const handleGoalScored = (payload: any) => {
            setLatestGoal(payload);
            setTimeout(() => setLatestGoal(null), 10000);
        };

        const handleWsException = (payload: any) => {
            console.error("🚨 Error del WebSocket:", payload)
            if (payload?.code === "RATE_LIMIT" && payload?.data?.retryIn) {
                const penaltySeconds = payload.data.retryIn;
                const newTimeout = Date.now() + penaltySeconds * 1000;
                setTimeoutUntil((prev) => (prev && prev > newTimeout ? prev : newTimeout));
            }
            if (payload?.code === "MATCH_INACTIVE") {
                console.warn("La tribuna está cerrada:", payload.message);
            }
        };

        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);
        socket.on("match_chat_history", handleMatchHistory);
        socket.on("on-message", handleOnMessage);
        socket.on("on_message_deleted", handleMessageDeleted);
        socket.on("ws-error", handleWsException);

        socket.on("megaphone_queued", handleMegaphoneQueued);
        socket.on("megaphone_show", handleMegaphoneShow);

        socket.on("match_live_update", handleMatchLiveUpdate);
        socket.on("stats_updated", handleStatsUpdated);
        socket.on("goal_scored", handleGoalScored);

        // Cleanup
        return () => {
            socket.off("connect", handleConnect);
            socket.off("disconnect", handleDisconnect);
            socket.off("match_chat_history", handleMatchHistory);
            socket.off("on-message", handleOnMessage);
            socket.off("on_message_deleted", handleMessageDeleted);
            socket.off("ws-error", handleWsException);

            socket.off("megaphone_queued", handleMegaphoneQueued);
            socket.off("megaphone_show", handleMegaphoneShow);

            socket.off("match_live_update", handleMatchLiveUpdate);
            socket.off("stats_updated", handleStatsUpdated);
            socket.off("goal_scored", handleGoalScored);
        };
    }, [socket, currentUserId, matchId]);

    const sendMessage = (
        message: string,
        stickerId: string | null = null,
        useMegaphone: boolean = false
    ) => {
        if (socket?.connected) {
            socket.emit("send_chat_message", {
                matchId,
                message,
                stickerId,
                useMegaphone
            });
        } else {
            console.warn("No se pudo enviar el mensaje: Socket desconectado");
        }
    };

    const deleteMessage = (messageId: string) => {
        if (socket?.connected) {
            socket.emit("delete_message", { matchId, messageId });
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
        liveData,
        matchStats,
        latestGoal,
    };
}