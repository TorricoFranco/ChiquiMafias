// src/components/chat/ChatPanel.tsx
"use client";

import { useState, useEffect } from "react";
import { ChevronRight, Megaphone, Smile, X } from "lucide-react";
import ChatMessage from "./MessageChat";
import LoginModal from "@/components/auth/LoginModal";
import StickerPopover from "./StickerPopover";
import clsx from "clsx";
import { useChatSocket } from "@/hook/socket/useChatSocket";
import { useUserStore } from "@/store/useUserStore";
import { useInventoryStore } from "@/store/useInventoryStore";

interface PinnedMegaphone {
  name: string;
  message: string;
  timestamp: number;
}

export default function ChatPanel({
  title,
  className,
  matchId,
}: {
  title?: string;
  className?: string;
  matchId?: string;
}) {
  const { items: inventoryItems, fetchInventory, consumeMegaphone } = useInventoryStore();
  const { messages, sendMessage, deleteMessage, timeoutUntil, setTimeoutUntil } = useChatSocket();
  const [input, setInput] = useState("");
  const [showLogin, setShowLogin] = useState(false);

  const { id, role } = useUserStore();

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showStickers, setShowStickers] = useState(false);
  const [useMegaphone, setUseMegaphone] = useState(false);

  const activeVariant = matchId ? "match" : "global";

  const [pinned, setPinned] = useState<PinnedMegaphone | null>(null);

  // Manejo del contador de baneo (Muteo)
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

  useEffect(() => {
    if (messages.length === 0) return;
    const latestMessage = messages[messages.length - 1];

    if (latestMessage.isMegaphone) {
      setPinned({
        name: latestMessage.name,
        message: latestMessage.message,
        timestamp: latestMessage.timestamp || Date.now()
      });
    }
  }, [messages]);

  useEffect(() => {
    if (!pinned) return;

    const fiveMinutes = 5 * 60 * 1000;
    const elapsed = Date.now() - pinned.timestamp;
    const remainingTime = fiveMinutes - elapsed;

    if (remainingTime <= 0) {
      setPinned(null);
      return;
    }

    const timer = setTimeout(() => {
      setPinned(null);
    }, remainingTime);

    return () => clearTimeout(timer);
  }, [pinned]);

  // 🔄 Traer el inventario inicial de Zustand apenas el usuario se loguea
  useEffect(() => {
    if (id) {
      fetchInventory();
    }
  }, [id, fetchInventory]);

  // ⚡ CÁLCULO REACTIVO: Buscamos cuántos megáfonos hay en el store global
  const megaphoneCount = inventoryItems.find(inv => inv.item.type === 'MEGAPHONE')?.quantity || 0;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const formatTimestamp = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleSend = async () => {
    if (!id) {
      setShowLogin(true);
      return;
    }
    if (timeLeft !== null || !input.trim()) return;
    sendMessage(input, null, useMegaphone);

    if (useMegaphone) {
      try {
        await consumeMegaphone();
      } catch (err) {
        console.error("Error al descontar megáfono:", err);
      }
    }
    setInput("");
    setUseMegaphone(false);
  };


  const handleSendSticker = (stickerAssetId: string) => {
    if (!id) { setShowLogin(true); return; }
    if (timeLeft !== null) return;

    // Los stickers no usan input de texto y viajan con isMegaphone: false
    sendMessage("", stickerAssetId, false);
  };

  return (
    <div className={clsx("bg-[#181818] flex flex-col p-4 h-full", className)}>
      <h2 className="text-lg font-semibold text-white mb-4">{title}</h2>

      {pinned && (
        <div className="mb-3 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-2xl p-3 shadow-lg shadow-amber-500/10 flex items-center justify-between border border-amber-400/30 animate-in slide-in-from-top-3 duration-300 z-10">
          <div className="flex items-start gap-2.5 min-w-0">
            <Megaphone className="w-4 h-4 text-black bg-white/20 p-0.5 rounded-md flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase text-black/60 tracking-wider block leading-none">Anuncio de {pinned.name}</span>
              <p className="text-xs font-bold text-black break-words leading-tight mt-0.5">{pinned.message}</p>
            </div>
          </div>
          <button onClick={() => setPinned(null)} className="text-black/50 hover:text-black p-1 transition-colors ml-2">
            <X className="w-3 h-3 stroke-[3]" />
          </button>
        </div>
      )}

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
            variant={activeVariant}
            onDelete={deleteMessage}
            nameColor={msg.nameColor}
            bannerId={msg.bannerId}
            stickerId={msg.stickerId}
            isMegaphone={msg.isMegaphone}
          />
        ))}
      </div>

      {/* Herramientas del Chat */}
      <div className="mt-3 flex flex-col space-y-2">
        {timeLeft !== null && (
          <div className="bg-red-900/30 border border-red-700 text-red-400 text-xs py-2 px-4 rounded-full text-center">
            Estás silenciado. Podrás volver a hablar en {formatTime(timeLeft)}
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
              "flex items-center gap-1.5 border text-[10px] font-black uppercase tracking-tighter px-3 py-1.5 rounded-xl transition-all ml-auto disabled:opacity-20 disabled:cursor-not-allowed",
              useMegaphone ? "bg-amber-500 border-amber-400 text-black font-black" : "bg-[#222] hover:bg-[#2b2b2b] border-white/5 text-gray-400"
            )}
          >
            <Megaphone className="w-3 h-3" /> Megáfono ({megaphoneCount})
          </button>

          {showStickers && (
            <StickerPopover
              onSelectSticker={handleSendSticker}
              onClose={() => setShowStickers(false)}
            />
          )}
        </div>

        {/* INPUT */}
        <div className="flex space-x-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={timeLeft !== null ? "Modo lectura..." : useMegaphone ? "¡Mensaje prioritario! 📢" : "Escribí en la tribuna..."}
            disabled={timeLeft !== null}
            className={clsx(
              "flex-1 p-3 rounded-full bg-[#2b2b2b] text-white outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs transition-all",
              useMegaphone ? "focus:ring-amber-500 border border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.15)] bg-amber-950/20" : "focus:ring-sky-600"
            )}
          />
          <button
            onClick={handleSend}
            disabled={timeLeft !== null}
            className={clsx(
              "p-3 rounded-full disabled:opacity-50 transition-colors flex items-center justify-center",
              useMegaphone ? "bg-amber-500 hover:bg-amber-600" : "bg-sky-600 hover:bg-sky-700"
            )}
          >
            <ChevronRight className={clsx("w-5 h-5", useMegaphone ? "text-black stroke-[3]" : "text-white")} />
          </button>
        </div>
      </div>

      {showLogin && (
        <LoginModal onClose={() => setShowLogin(false)} onSuccess={handleSend} />
      )}
    </div>
  );
}