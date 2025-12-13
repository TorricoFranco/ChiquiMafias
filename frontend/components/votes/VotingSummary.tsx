// src/components/votaciones/VotacionesResumen.tsx
"use client";
import { MOCK_VOTACIONES } from "@/lib/mocks";
import { ChevronRight } from "lucide-react";

export default function VotingSummary() {
  return (
    <div className="bg-[#181818] p-4 flex flex-col h-full">
      <h2 className="text-lg font-semibold text-white mb-3">Votaciones Destacadas</h2>
      <div className="flex space-x-4 overflow-x-auto pb-2 custom-scrollbar">
        {MOCK_VOTACIONES.map((vote, i) => (
          <div key={i} className="flex-shrink-0 w-64 p-4 bg-[#1f1f1f] rounded-xl border border-[#2b2b2b]">
            <div className="flex items-center justify-between mb-2">
              <div>{vote.icon}</div>
              <span className="text-sm font-medium text-yellow-400">{vote.subtitle}</span>
            </div>
            <p className="text-base font-semibold text-white truncate mb-2">{vote.title}</p>
            <button className="text-xs text-gray-400 flex items-center bg-[#2b2b2b] px-2 py-1 rounded-full">
              Ver votación <ChevronRight className="w-3 h-3 ml-1" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
