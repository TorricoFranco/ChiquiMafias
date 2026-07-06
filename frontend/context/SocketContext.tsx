"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useUserStore } from "@/store/useUserStore"; 

const SocketContext = createContext<Socket | null>(null);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { accessToken } = useUserStore(); 
  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_API_URL as string, {
      auth: { token: accessToken }, 
      transports: ["websocket"],
      reconnection: true,
      autoConnect: true,
    });

    newSocket.on("connect", () => {
      const currentToken = useUserStore.getState().accessToken;
      console.log(`✅ Socket global conectado (${currentToken ? "Usuario" : "Invitado"}):`, newSocket.id);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []); 
  useEffect(() => {
    if (!socket) return;

    socket.auth = { ...socket.auth, token: accessToken };


    if (socket.connected) {
      console.log("🔄 Sincronizando socket por cambio de credenciales...");
      socket.disconnect().connect();
    }
  }, [accessToken, socket]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useGlobalSocket = () => useContext(SocketContext);