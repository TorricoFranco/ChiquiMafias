"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronRight, Megaphone, Smile, X, Info } from "lucide-react";
import ChatMessage from "./ChatMesage";
import LoginModal from "@/features/auth/components/LoginModal";
import MegaphoneBanner from "./MegaphoneMessage";
import MessageNewPoll from "./MessagesNewPoll";
import Stickerpopover from "./Stickerpopover";
import UserProfileModal from "@/features/profile/components/UserPublicProfileModal";
import clsx from "clsx";
import { useChatSocket } from "../socket/useChatSocket";
import { useUserStore } from "@/store/useUserStore";
import { useUserInventory, useConsumeItem } from "@/features/inventory/hooks/useInventory";
import { useQueryClient } from '@tanstack/react-query';
import { SubscriptionRewardModal } from "@/features/subscriptions/components/SubscriptionRewardModal";



interface PinnedMegaphone {
  name: string;
  message: string;
  timestamp: number;
}

export function ChatPanel({
  title,
  className,
  matchId,
}: {
  title?: string;
  className?: string;
  matchId?: string;
}) {
  const queryClient = useQueryClient();
  const { data: inventory } = useUserInventory();
  const { mutateAsync: consumeItem } = useConsumeItem();

  const [input, setInput] = useState("");
  const [showLogin, setShowLogin] = useState(false);

  const { id, role } = useUserStore();

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showStickers, setShowStickers] = useState(false);
  const [useMegaphone, setUseMegaphone] = useState(false);

  const {
    messages, sendMessage, deleteMessage, timeoutUntil, setTimeoutUntil,
    activeMegaphone, setActiveMegaphone, queuePosition, activePoll, setActivePoll, pendingGifts, setPendingGifts
  } = useChatSocket();

  const activeVariant = matchId ? "match" : "global";

  const [pinned, setPinned] = useState<PinnedMegaphone | null>(null);

  const megaphoneItem = inventory?.megaphones?.[0];
  const megaphoneCount = megaphoneItem?.quantity || 0;

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

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
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
      }, 500);
    }

    setInput("");
    setUseMegaphone(false);
  };

  const handleSendSticker = (stickerAssetId: string) => {
    if (!id) { setShowLogin(true); return; }
    if (timeLeft !== null) return;

    sendMessage("", stickerAssetId, false);
  };

  return (
    <div className={clsx("bg-[#131313] flex flex-col p-3 sm:p-4 h-full border-l border-white/5", className)}>
      {title && (
        <div className="flex items-center gap-2 mb-4">
          <span className="w-1 h-5 rounded-full bg-[#d2f000]" />
          <h2 className="text-base sm:text-lg font-headline font-bold uppercase tracking-wider text-white">{title}</h2>
        </div>
      )}

      {pendingGifts && (
        <SubscriptionRewardModal
          data={pendingGifts}
          onClose={() => setPendingGifts(null)}
        />
      )}

      {activeMegaphone && (
        <MegaphoneBanner
          megaphone={activeMegaphone}
          onClose={() => setActiveMegaphone(null)}
        />
      )}

      {activePoll && (
        <MessageNewPoll
          poll={activePoll}
          onClose={() => setActivePoll(null)}
        />
      )}

      {queuePosition !== null && (
        <div className="mb-3 bg-sky-500/10 border border-sky-400/30 rounded-xl p-2.5 flex items-center gap-2 text-sky-300 text-xs animate-in slide-in-from-top-2 shadow-[0_0_12px_rgba(56,189,248,0.08)]">
          <Info className="w-4 h-4 flex-shrink-0" />
          <p>Tu megáfono está en la posición <b>#{queuePosition}</b> de la cola. ¡Ya sale!</p>
        </div>
      )}

      {pinned && (
        <div className="mb-3 bg-[#1a1503]/80 rounded-2xl p-3 shadow-[0_0_20px_rgba(245,158,11,0.15)] flex items-center justify-between border border-amber-400/40 animate-in slide-in-from-top-3 duration-300 z-10 backdrop-blur-sm">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="bg-amber-400/20 text-amber-300 p-1.5 rounded-lg flex-shrink-0 mt-0.5">
              <Megaphone className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase text-amber-400 tracking-widest block leading-none">Anuncio de {pinned.name}</span>
              <p className="text-xs font-bold text-amber-100 break-words leading-tight mt-0.5">{pinned.message}</p>
            </div>
          </div>
          <button onClick={() => setPinned(null)} className="text-amber-400/50 hover:text-amber-200 p-1 transition-colors ml-2">
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
            senderRole={msg.role}
            tier={msg.tier}
            variant={activeVariant}
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

      {/* Herramientas del Chat */}
      <div className="mt-3 flex flex-col space-y-2">
        {timeLeft !== null && (
          <div className="bg-red-500/10 border border-red-500/40 text-red-400 text-xs py-2 px-4 rounded-full text-center shadow-[0_0_12px_rgba(239,68,68,0.08)]">
            Estás silenciado. Podrás volver a hablar en {formatTime(timeLeft)}
          </div>
        )}

        <div className="flex items-center relative">
          <button
            onClick={() => setShowStickers(!showStickers)}
            className={clsx(
              "flex items-center gap-1.5 border text-[10px] font-black uppercase tracking-tighter px-3 py-1.5 rounded-xl transition-all",
              showStickers ? "bg-sky-500/15 border-sky-400/60 text-sky-300 shadow-[0_0_10px_rgba(56,189,248,0.15)]" : "bg-[#1e1e1e] hover:bg-[#2a2a2a] border-white/5 text-gray-300"
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
              useMegaphone
                ? "bg-amber-500 border-amber-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.35)]"
                : "bg-[#1e1e1e] hover:bg-[#2a2a2a] border-white/5 text-gray-400"
            )}
          >
            <img
              src="/icons/megaphone-icon.png"
              alt="Megáfono"
              className="w-6 h-6 object-contain"
            />

            <span>
              Megáfono ({megaphoneCount})
            </span>
          </button>

          {showStickers && (
            <Stickerpopover
              onSelectSticker={handleSendSticker}
              onClose={() => setShowStickers(false)}
            />
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
                  ? "bg-[#1e1e1e] text-gray-500 border border-gray-600/50 shadow-inner"
                  : useMegaphone
                    ? "focus:ring-2 focus:ring-amber-500 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.2)] bg-amber-950/20 text-white"
                    : "bg-[#1e1e1e] text-white border border-white/5 focus:border-[#d2f000]/50 focus:ring-2 focus:ring-[#d2f000]/30"
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
              useMegaphone ? "bg-amber-500 hover:bg-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]" : "bg-[#d2f000] hover:bg-[#e4ff26] shadow-[0_0_15px_rgba(210,240,0,0.35)]"
            )}
          >
            <ChevronRight className={clsx("w-5 h-5", useMegaphone ? "text-black stroke-[3]" : "text-black")} />
          </button>
        </div>
      </div>

      {showLogin && (
        <LoginModal onClose={() => setShowLogin(false)} onSuccess={handleSend} />
      )}

      <UserProfileModal
        userId={selectedProfileId}
        onClose={() => setSelectedProfileId(null)}
      />
    </div>
  );
}