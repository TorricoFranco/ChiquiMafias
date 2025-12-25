import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const connectSocket = (token?: string) => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_WS_URL!, {
      auth: token ? { token } : {},
    });
  }
  return socket;
};

export const getSocket = () => socket;
