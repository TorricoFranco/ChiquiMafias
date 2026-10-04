"use client";

import { useState, useRef, useEffect } from "react";
import clsx from "clsx";
import { Smile, ChevronRight, Megaphone, Info, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import ChatMessage from "@/features/chat/components/ChatMesage";
import { useMatchSocket } from "../socket/useMatchChatLive";
import { useUserStore } from "@/store/useUserStore";
import { useUserInventory } from "@/features/inventory/hooks/useInventory";
import LoginModal from "@/features/auth/components/LoginModal";
import UserProfileModal from "@/features/profile/components/UserPublicProfileModal";
import MegaphoneBanner from "@/features/chat/components/MegaphoneMessage";
import Stickerpopover from "@/features/chat/components/Stickerpopover";

export function MatchChat({ matchId, className }: { matchId: string; className?: string }) {
  const queryClient = useQueryClient();
  const { id, role } = useUserStore();
  const { data: inventory } = useUserInventory();

  const [input, setInput] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showStickers, setShowStickers] = useState(false);
  const [useMegaphone, setUseMegaphone] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  const {
    messages,
    sendMessage,
    deleteMessage,
    timeoutUntil,
    setTimeoutUntil,
    activeMegaphone,
    setActiveMegaphone,
    queuePosition,
  } = useMatchSocket(matchId);

  const megaphoneItem = inventory?.megaphones?.[0];
  const megaphoneCount = megaphoneItem?.quantity || 0;

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!timeoutUntil) {
      setTimeLeft(null);
      return;
    }
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = timeoutUntil - now;
      if (diff <= 0) {
        setTimeLeft(null);
        setTimeoutUntil(null);
        clearInterval(interval);
      } else {
        setTimeLeft(Math.ceil(diff / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [timeoutUntil, setTimeoutUntil]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const formatTimestamp = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const handleSend = async () => {
    if (!id) {
      setShowLogin(true);
      return;
    }
    if (timeLeft !== null || !input.trim()) return;

    sendMessage(input, null, useMegaphone);

    if (useMegaphone) {
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["inventory"] }), 500);
    }

    setInput("");
    setUseMegaphone(false);
  };

  const handleSendSticker = (stickerAssetId: string) => {
    if (!id) {
      setShowLogin(true);
      return;
    }
    if (timeLeft !== null) return;
    sendMessage("", stickerAssetId, false);
    setShowStickers(false);
  };

  return (
    <div className={clsx("bg-[#181818] flex flex-col p-4 rounded-2xl border border-[#2b2a2a]", className)}>

      {activeMegaphone && (
        <MegaphoneBanner megaphone={activeMegaphone} onClose={() => setActiveMegaphone(null)} />
      )}

      {queuePosition !== null && (
        <div className="mb-3 bg-sky-900/30 border border-sky-500/50 rounded-xl p-2 flex items-center gap-2 text-sky-400 text-xs animate-in slide-in-from-top-2">
          <Info className="w-4 h-4 flex-shrink-0" />
          <p>Tu megáfono está en la posición <b>#{queuePosition}</b> de la cola. ¡Ya sale!</p>
        </div>
      )}

      {/* Lista de Mensajes */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.messageId}
            messageId={msg.messageId}
            userId={msg.userId}
            user={msg.name}
            time={formatTimestamp(msg.timestamp)}
            teamName={msg.teamName}
            message={msg.message}
            avatar={msg.badgeUrl}
            currentRole={role}
            senderRole={msg.role}
            tier={msg.tier}
            variant="match"
            onDelete={deleteMessage}
            nameColor={msg.nameColor}
            stickerId={msg.stickerId}
            isMegaphone={msg.isMegaphone}
            isOwnMessage={msg.userId === id}
            chatBubbleId={msg.chatBubbleId}
            onAvatarClick={() => setSelectedProfileId(msg.userId)}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="mt-3 flex flex-col space-y-2">
        {timeLeft !== null && (
          <div className="bg-red-900/30 border border-red-700 text-red-400 text-xs py-2 px-4 rounded-full text-center">
            Arafue. Estás silenciado por {formatTime(timeLeft)}
          </div>
        )}

        <div className="flex items-center relative">
          <button
            onClick={() => setShowStickers(!showStickers)}
            className={clsx(
              "flex items-center gap-1.5 border text-[10px] font-black uppercase tracking-tighter px-3 py-1.5 rounded-xl transition-all",
              showStickers ? "bg-sky-900/40 border-sky-500 text-sky-400" : "bg-[#222] hover:bg-[#2b2b2b] border-white/5 text-gray-300"
            )}
          >
            <Smile className="w-3 h-3" /> Stickers
          </button>

          <button
            type="button"
            disabled={megaphoneCount <= 0}
            onClick={() => setUseMegaphone(!useMegaphone)}
            className={clsx(
              "flex items-center gap-2 border text-[10px] font-black uppercase tracking-tighter px-3.5 py-2 rounded-xl transition-all ml-auto disabled:opacity-20 disabled:cursor-not-allowed",
              useMegaphone ? "bg-amber-500 border-amber-400 text-black font-black" : "bg-[#222] hover:bg-[#2b2b2b] border-white/5 text-gray-400"
            )}
          >
            <img src="/icons/megaphone-icon.png" alt="Megáfono" className="w-6 h-6 object-contain" />
            <span>Megáfono ({megaphoneCount})</span>
          </button>

          {showStickers && (
            <Stickerpopover onSelectSticker={handleSendSticker} onClose={() => setShowStickers(false)} />
          )}
        </div>

        <div className="flex space-x-2">
          <div className="relative flex-1">
            <input
              maxLength={100}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={timeLeft !== null ? "Modo lectura..." : useMegaphone ? "¡Mensaje prioritario! 📢" : "Escribí en la tribuna..."}
              disabled={timeLeft !== null}
              className={clsx(
                "w-full p-3 pr-14 rounded-full outline-none disabled:opacity-50 disabled:cursor-not-allowed text-xs transition-all",
                input.length >= 100
                  ? "bg-[#222] text-gray-500 border border-gray-600/50 shadow-inner"
                  : useMegaphone
                    ? "focus:ring-2 focus:ring-amber-500 border border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.15)] bg-amber-950/20 text-white"
                    : "bg-[#2b2b2b] text-white focus:ring-2 focus:ring-sky-600"
              )}
            />
            <span className={clsx(
              "absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold transition-colors",
              input.length >= 100 ? "text-red-400" : "text-gray-500"
            )}>
              {input.length}/100
            </span>
          </div>
          <button
            onClick={handleSend}
            disabled={timeLeft !== null || input.trim().length === 0}
            className={clsx(
              "p-3 rounded-full disabled:opacity-50 transition-colors flex items-center justify-center flex-shrink-0",
              useMegaphone ? "bg-amber-500 hover:bg-amber-600" : "bg-sky-600 hover:bg-sky-700"
            )}
          >
            <ChevronRight className={clsx("w-5 h-5", useMegaphone ? "text-black stroke-[3]" : "text-white")} />
          </button>
        </div>
      </div>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} onSuccess={handleSend} />}
      <UserProfileModal userId={selectedProfileId} onClose={() => setSelectedProfileId(null)} />
    </div>
  );
}