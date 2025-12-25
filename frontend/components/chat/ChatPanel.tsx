"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import ChatMessage from "./MessageChat";
import { useChatSocket } from "@/hook/useChatSocket";
import LoginModal from "@/components/auth/LoginModal";

export default function ChatPanel({ title }: { title?: string }) {
  const { messages, sendMessage } = useChatSocket();
  const [input, setInput] = useState("");
  const [showLogin, setShowLogin] = useState(false);

  const handleSend = () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setShowLogin(true);
      return;
    }

    if (!input.trim()) return;

    sendMessage(input);
    setInput("");
  };

  return (
    <>
      {/* PANEL */}
      <div className="bg-[#181818] flex flex-col p-4">
        <h2 className="text-lg font-semibold text-white mb-4">{title}</h2>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.map((msg, index) => (
            <ChatMessage key={index} {...msg} />
          ))}
        </div>

        <div className="mt-4 flex space-x-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1 p-3 rounded-full bg-[#2b2b2b] text-white"
          />
          <button
            onClick={handleSend}
            className="bg-sky-600 p-3 rounded-full"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* MODAL LOGIN */}
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
        />
      )}
    </>
  );
}
