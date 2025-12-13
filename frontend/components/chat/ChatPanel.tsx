// src/components/chat/ChatPanel.tsx
"use client";
import { ChevronRight } from "lucide-react";
import ChatMessage from "./MessageChat";
import { ChatMessagesProps } from "@/types/messages";

export default function ChatPanel({
    title,
    messages,
    className = ""
  }: {
    title?: string;
    messages: ChatMessagesProps;
    className?: string;
  })
  {
  return (
   <div className={`bg-[#181818] flex flex-col p-4 ${className}`}>
      <h2 className="text-lg font-semibold text-white mb-4">{title}</h2>
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
      {messages.map((msg, index) => (
        <ChatMessage
          key={index}
          avatar={msg.avatar}
          user={msg.user}
          time={msg.time}
          message={msg.message}
        />
      ))}
    </div>

      <div className="mt-4 flex space-x-2">
        <input placeholder="Escribe un mensaje..." className="flex-1 p-3 rounded-full bg-[#2b2b2b] text-white" />
        <button className="bg-sky-600 p-3 rounded-full"><ChevronRight className="w-5 h-5" /></button>
      </div>
    </div>
  );
}
