import { io } from "socket.io-client";

export const connectSocket = (token?: string) => {
  return io(process.env.NEXT_PUBLIC_API_URL, {
    auth: {
      token: token // El backend NestJS lo recibirá en client.handshake.auth.token
    },
    forceNew: true, // Obliga a crear una conexión nueva y no reusar la anterior
    reconnectionAttempts: 5,
  });
};