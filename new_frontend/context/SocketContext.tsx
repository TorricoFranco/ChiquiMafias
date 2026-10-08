"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useUserStore } from "@/store/useUserStore";
import { refreshAccessToken } from "@/lib/apiFetch";

const SocketContext = createContext<Socket | null>(null);

// Si el backend nos vuelve a cortar enseguida después de renovar, el motivo no es el token: no insistimos.
const KICK_REFRESH_COOLDOWN_MS = 30_000;

// Sockets ya cerrados por el cleanup: el efecto del token no tiene que revivirlos (pasa con Fast Refresh en dev).
const disposedSockets = new WeakSet<Socket>();

const handshakeToken = (socket: Socket) => (socket.auth as { token?: string | null }).token ?? null;

export const SocketProvider = ({ children }: { children: ReactNode }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const accessToken = useUserStore((state) => state.accessToken);

    useEffect(() => {
        const newSocket = io(process.env.NEXT_PUBLIC_API_URL as string, {
            auth: { token: useUserStore.getState().accessToken },
            transports: ["websocket"],
            reconnection: true,
            autoConnect: true,
        });

        let disposed = false;
        let lastKickRefreshAt = 0;

        // El backend corta con socket.disconnect() si el token venció (handleConnection de chat.gateway),
        // y ante "io server disconnect" socket.io-client no reintenta: renovamos el token y reconectamos.
        const handleDisconnect = async (reason: Socket.DisconnectReason) => {
            if (reason !== "io server disconnect" || !useUserStore.getState().accessToken) return;
            if (Date.now() - lastKickRefreshAt < KICK_REFRESH_COOLDOWN_MS) return;
            lastKickRefreshAt = Date.now();

            // El token expulsado es el del handshake, que puede ser más viejo que el del store.
            const token = await refreshAccessToken(handshakeToken(newSocket));
            if (disposed || useUserStore.getState().isBanned) return;

            newSocket.auth = { ...newSocket.auth, token };
            if (!newSocket.active) newSocket.connect();
        };

        newSocket.on("disconnect", handleDisconnect);
        setSocket(newSocket);

        return () => {
            disposed = true;
            disposedSockets.add(newSocket);
            newSocket.off("disconnect", handleDisconnect);
            newSocket.disconnect();
        };
    }, []);

    useEffect(() => {
        if (!socket || disposedSockets.has(socket)) return;

        // Ya conectado (o reconectando) con este token.
        if (handshakeToken(socket) === accessToken && socket.active) return;

        socket.auth = { ...socket.auth, token: accessToken };

        if (socket.connected) {
            socket.disconnect().connect();
        } else if (!socket.active) {
            // Quedó cortado por el backend: socket.io no reintenta solo en ese caso.
            socket.connect();
        }
    }, [accessToken, socket]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};

export const useGlobalSocket = () => useContext(SocketContext);
