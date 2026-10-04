"use client";

import { useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useUserStore } from "@/store/useUserStore";
import { Market, AdminMarket } from "../types";
import { useQueryClient } from "@tanstack/react-query";

interface PoolUpdatePayload {
    marketId: string;
    optionId: string;
    newTotalStaked: number;
    newOdds: number;
    options?: { id: string; totalStaked: number; currentOdds: number }[];
}

interface StatusUpdatePayload {
    marketId: string;
    status: 'LOCKED' | 'SETTLED' | 'REFUNDED';
}

export function useBetsSocket() {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [connected, setConnected] = useState(false);
    const { accessToken } = useUserStore();
    const queryClient = useQueryClient();

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
            wsSocket.emit("join_dashboard");
        });

        wsSocket.on("disconnect", () => {
            setConnected(false);
        });

        setSocket(wsSocket);

        return () => {
            if (wsSocket.connected) {
                wsSocket.emit("leave_dashboard");
            }
            wsSocket.disconnect();
        };
    }, [accessToken]);

    const handleMarketCreated = useCallback((newMarket: Market) => {
        queryClient.setQueryData(["markets"], (oldMarkets: Market[] | undefined) => {
            if (!oldMarkets) return [newMarket];
            if (oldMarkets.some((m) => m.id === newMarket.id)) return oldMarkets;
            return [newMarket, ...oldMarkets];
        });
    }, [queryClient]);

    const handlePoolUpdated = useCallback((payload: PoolUpdatePayload) => {
        // 1. Creamos una función reutilizable que actualiza los datos
        const updateMarketsState = (oldMarkets: Market[] | AdminMarket[] | undefined) => {
            if (!oldMarkets) return oldMarkets;

            return (oldMarkets as any[]).map((market) => {
                if (market.id !== payload.marketId) return market;

                const updatedOptions = market.options.map((opt: any) => {
                    const updatedOption = payload.options?.find(({ id }) => id === opt.id);
                    if (updatedOption) {
                        return {
                            ...opt,
                            totalStaked: updatedOption.totalStaked,
                            currentOdds: updatedOption.currentOdds,
                        };
                    }
                    if (opt.id === payload.optionId) {
                        return {
                            ...opt,
                            totalStaked: payload.newTotalStaked,
                            currentOdds: payload.newOdds,
                        };
                    }
                    return opt;
                });

                return { ...market, options: updatedOptions };
            });
        };

        queryClient.setQueryData(["markets"], updateMarketsState);

        queryClient.setQueryData(["admin-markets"], updateMarketsState);

    }, [queryClient]);

    const handleStatusChanged = useCallback((payload: StatusUpdatePayload) => {

        queryClient.setQueryData(["markets"], (oldMarkets: Market[] | undefined) => {
            if (!oldMarkets) return oldMarkets;

            return oldMarkets.map((market) =>
                market.id === payload.marketId
                    ? { ...market, status: payload.status }
                    : market
            );
        });
    }, [queryClient]);

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