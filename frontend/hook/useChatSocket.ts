"use client";

import { useEffect, useState } from "react";
import { connectSocket } from "@/services/socket";
// import { ChatMessage } from "@/types/messages";
import { ChatMessagesProps } from "@/types/messages";

export function useChatSocket() {
  const [messages, setMessages] = useState<ChatMessagesProps[]>([]);
  const [users, setUsers] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const socket = connectSocket(token ?? undefined);

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("on-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("on-clients-changed", (users) => {
      setUsers(users.map((u: any) => u.name));
    });

    socket.on("ws-error", (err) => {
      console.error("WS ERROR", err);
    });

    return () => {
      socket.off();
    };
  }, []);

  const sendMessage = (body: string) => {
    const socket = connectSocket();
    socket.emit("send-message", { body });
  };

  return {
    messages,
    users,
    connected,
    sendMessage,
  };
}
