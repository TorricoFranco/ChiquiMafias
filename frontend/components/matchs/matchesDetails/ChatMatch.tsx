"use client";

import { useEffect, useState, useRef } from "react";
import { useMatchChat } from "@/hook/socket/useMatchesChat";
import { MessageCircle, Send } from "lucide-react";
import { useUserStore } from "@/store/useUserStore";
import ChatMessage from "@/components/chat/MessageChat";

export const ChatMatch = ({ matchId, active }: { matchId: string, active: boolean }) => {
  const [input, setInput] = useState("");

  const { messages, sendMessage, deleteMessage, timeoutUntil, setTimeoutUntil } = useMatchChat(matchId);
  const { role } = useUserStore();

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!timeoutUntil) return setTimeLeft(null);
    const interval = setInterval(() => {
      const diff = timeoutUntil - Date.now();
      if (diff <= 0) {
        setTimeLeft(null);
        setTimeoutUntil(null);
      } else {
        setTimeLeft(Math.ceil(diff / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [timeoutUntil, setTimeoutUntil]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (timeLeft !== null || !input.trim()) return;
    sendMessage(input);
    setInput("");
  };

  if (!active) return (
    <div className="bg-black/20 rounded-3xl border border-white/5 p-8 text-center">
      <MessageCircle className="w-8 h-8 text-gray-700 mx-auto mb-3" />
      <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
        El chat se activará con las alineaciones
      </p>
    </div>
  );

  return (
    <div className="bg-[#111] rounded-3xl border border-white/10 flex flex-col h-[500px] overflow-hidden">
      <div className="p-4 border-b border-white/5 bg-white/5 flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-tighter">Chat de la Tribuna</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.messageId}
            userId={msg.userId}
            user={msg.name}
            teamName={msg.teamName}
            message={msg.message}
            currentRole={role}
            avatar={msg.badgeUrl}
            variant="match"
            messageId={msg.messageId}
            onDelete={() => deleteMessage(msg.messageId)}
          />
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-4 bg-black/40 border-t border-white/5 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={timeLeft !== null}
          placeholder={timeLeft !== null ? `Silenciado por ${timeLeft}s...` : "Escribí algo en la tribuna..."}
          className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-2 text-xs outline-none focus:border-sky-500 disabled:opacity-50 text-white"
        />
        <button
          type="submit"
          disabled={timeLeft !== null || !input.trim()}
          className="bg-sky-500 p-2 rounded-xl disabled:opacity-30"
        >
          <Send className="w-4 h-4 text-black" />
        </button>
      </form>
    </div>
  );
};