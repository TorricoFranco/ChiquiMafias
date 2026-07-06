"use client";

import { useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useUserStore } from "@/store/useUserStore";
import { Market } from "@/services/betsApi";

interface PoolUpdatePayload {
    marketId: string;
    totalPool: number;
    options: { id: string; totalStaked: number }[];
}

interface StatusUpdatePayload {
    marketId: string;
    status: 'LOCKED' | 'SETTLED' | 'REFUNDED';
}

export function useBetsSocket(setMarkets: React.Dispatch<React.SetStateAction<Market[]>>) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [connected, setConnected] = useState(false);
    const { accessToken } = useUserStore();

    // 1. Inicializar la conexión al Namespace específico '/bets'
    useEffect(() => {
        const betsUrl = `${process.env.NEXT_PUBLIC_API_URL}/bets`;

        const wsSocket = io(betsUrl, {
            auth: { token: accessToken },
            transports: ["websocket"],
            reconnection: true,
            autoConnect: true,
        });

        wsSocket.on("connect", () => {
            setConnected(true);
            console.log("🎰 Socket de Apuestas conectado con éxito:", wsSocket.id);
            // Nos unimos a la habitación global del dashboard del bck
            wsSocket.emit("join_dashboard");
        });

        wsSocket.on("disconnect", () => {
            setConnected(false);
            console.log("🎰 Socket de Apuestas desconectado");
        });

        setSocket(wsSocket);

        return () => {
            if (wsSocket.connected) {
                wsSocket.emit("leave_dashboard");
            }
            wsSocket.disconnect();
        };
    }, [accessToken]);

    // ==========================================
    // HANDLERS DE EVENTOS (MUTACIÓN DEL ESTADO)
    // ==========================================

    // Escucha cuando el admin crea un nuevo mercado en vivo
    const handleMarketCreated = useCallback((newMarket: Market) => {
        console.log("🆕 Mercado creado recibido por WS:", newMarket);
        setMarkets((prev) => {
            // Evitamos duplicados por las dudas
            if (prev.some((m) => m.id === newMarket.id)) return prev;
            return [newMarket, ...prev];
        });
    }, [setMarkets]);

    // Escucha las variaciones de los pozos cuando alguien apuesta (Pari-Mutuel en vivo)
    const handlePoolUpdated = useCallback((payload: PoolUpdatePayload) => {
        console.log("💰 Pozo actualizado por WS:", payload);
        setMarkets((prev) =>
            prev.map((market) => {
                if (market.id !== payload.marketId) return market;

                // Mapeamos las opciones viejas inyectando los nuevos montos apostados (totalStaked)
                const updatedOptions = market.options.map((opt) => {
                    const incomingOpt = payload.options.find((o) => o.id === opt.id);
                    return incomingOpt
                        ? { ...opt, totalStaked: incomingOpt.totalStaked }
                        : opt;
                });

                return { ...market, options: updatedOptions };
            })
        );
    }, [setMarkets]);

    // Escucha bloqueos de tarjetas (cuando arranca el partido) o liquidaciones
    const handleStatusChanged = useCallback((payload: StatusUpdatePayload) => {
        console.log("🔒 Estado de mercado cambiado por WS:", payload);
        setMarkets((prev) =>
            prev.map((market) =>
                market.id === payload.marketId
                    ? { ...market, status: payload.status }
                    : market
            )
        );
    }, [setMarkets]);

    // 2. Efecto para encender y apagar los listeners nativos del Gateway
    useEffect(() => {
        if (!socket) return;

        socket.on("market_created", handleMarketCreated);
        socket.on("market_pool_updated", handlePoolUpdated);
        socket.on("market_status_changed", handleStatusChanged);

        return () => {
            socket.off("market_created", handleMarketCreated);
            socket.off("market_pool_updated", handlePoolUpdated);
            socket.off("market_status_changed", handleStatusChanged);
        };
    }, [socket, handleMarketCreated, handlePoolUpdated, handleStatusChanged]);

    return { connected };
}