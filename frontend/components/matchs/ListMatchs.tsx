"use client";
import MatchCard from "./CardMatch";
import { MOCK_PARTIDOS } from "@/lib/mocks";

export default function ListMatchs() {
  return (
    <div className="bg-[#181818] p-4 flex flex-col h-full overflow-y-auto custom-scrollbar">
      <h2 className="text-lg font-semibold text-white mb-4">Partidos en Vivo</h2>
      <div className="space-y-3">
        {MOCK_PARTIDOS.map((p) => (
          <MatchCard key={p.id} match={p} />
        ))}
      </div>
    </div>
  );
}
