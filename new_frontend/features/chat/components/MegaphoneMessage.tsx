"use client";

import { useEffect, useState } from "react";
import { Megaphone, X } from "lucide-react";
import { PinnedMegaphone } from "../socket/useChatSocket";

interface MegaphoneBannerProps {
  megaphone: PinnedMegaphone;
  onClose: () => void;
}

export default function MegaphoneBanner({ megaphone, onClose }: MegaphoneBannerProps) {
  useEffect(() => {
    const fiveMinutes = 5 * 60 * 1000;
    const elapsed = Date.now() - megaphone.timestamp;
    const remainingTime = fiveMinutes - elapsed;

    if (remainingTime <= 0) {
      onClose();
      return;
    }

    const timer = setTimeout(() => {
      onClose();
    }, remainingTime);

    return () => clearTimeout(timer);
  }, [megaphone.timestamp, onClose]);

  return (
    <div className="mb-3 bg-[#1a1503]/80 rounded-2xl p-3 shadow-[0_0_20px_rgba(245,158,11,0.15)] flex items-center justify-between border border-amber-400/40 animate-in slide-in-from-top-3 duration-300 z-10 backdrop-blur-sm">
      <div className="flex items-start gap-2.5 min-w-0">
        <div className="bg-amber-400/20 text-amber-300 p-1.5 rounded-lg flex-shrink-0 mt-0.5">
          <Megaphone className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <span className="text-[10px] font-black uppercase text-amber-400 tracking-widest block leading-none">
            Anuncio de {megaphone.name}
          </span>
          <p className="text-xs font-bold text-amber-100 break-words leading-tight mt-0.5">
            {megaphone.message}
          </p>
        </div>
      </div>
      <button
        onClick={onClose}
        className="text-amber-400/50 hover:text-amber-200 p-1 transition-colors ml-2"
      >
        <X className="w-3 h-3 stroke-[3]" />
      </button>
    </div>
  );
}