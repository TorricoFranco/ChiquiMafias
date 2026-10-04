"use client";

import React from "react";
import { BarChart2, X, ChevronRight } from "lucide-react";
import { ActivePollMessage } from "@/features/polls/types";

interface MessageNewPollProps {
  poll: ActivePollMessage;
  onClose: () => void;
}

export default function MessageNewPoll({ poll, onClose }: MessageNewPollProps) {
  const handleVoteClick = () => {
    const event = new CustomEvent('focus-poll', { detail: { pollId: poll.id } });
    window.dispatchEvent(event);
    onClose();
  };

  return (
    <div className="mb-3 bg-[#161a05]/80 rounded-2xl p-3 shadow-[0_0_20px_rgba(210,240,0,0.12)] flex items-center justify-between border border-[#d2f000]/30 animate-in slide-in-from-top-3 duration-300 z-10 backdrop-blur-sm">
      <div className="flex items-start gap-2.5 min-w-0">
        <div className="bg-[#d2f000]/15 text-[#d2f000] p-1.5 rounded-lg flex-shrink-0 mt-0.5">
          <BarChart2 className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <span className="text-[10px] font-black uppercase text-[#d2f000] tracking-widest block leading-none">
            Nueva Encuesta en la Tribuna
          </span>
          <p className="text-xs font-bold text-white break-words leading-tight mt-1">
            {poll.title}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        <button
          onClick={handleVoteClick}
          className="bg-[#d2f000] hover:bg-[#b8d400] text-black text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-md cursor-pointer"
        >
          Votar <ChevronRight className="w-3 h-3 stroke-[3]" />
        </button>
        <button 
          onClick={onClose} 
          className="text-gray-400 hover:text-white p-1 transition-colors cursor-pointer"
        >
          <X className="w-3 h-3 stroke-[3]" />
        </button>
      </div>
    </div>
  );
}