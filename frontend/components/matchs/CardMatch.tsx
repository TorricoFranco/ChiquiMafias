// src/components/matchs/matchCard.tsx
"use client";
import { Match } from "@/types/matchs";
import Link from "next/link";

export default function MatchCard({ match }: {match: Match}) {
  return (
    <Link href={`/match/${match.id}`}>
    <div className={`p-3 rounded-xl cursor-pointer transition duration-200 ${match.isLive ? 'bg-lime-900/40 border-2 border-lime-600/60' : 'bg-[#1f1f1f] hover:bg-[#2b2b2b]'}`}>
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <div className="flex items-center text-sm text-gray-300"><span className="mr-2">🛡️</span>{match.local}</div>
          <div className="flex items-center text-sm text-gray-300"><span className="mr-2">⚔️</span>{match.visitante}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white mb-1">{match.score}</div>
          <div className={`text-xs font-semibold rounded-full px-2 py-0.5 ${match.isLive ? 'bg-lime-600 text-black' : 'bg-gray-700 text-gray-300'}`}>
            {match.isLive ? `${match.estado} - Min ${match.minuto}` : match.estado}
          </div>
        </div>
      </div>
        {Array.isArray(match.events) && match.events.length > 0 && (
      <div className="mt-2 text-xs text-gray-400 flex justify-end">
        {match.events.join(' ')}
      </div>
    )}

    </div>
    </Link>
  );
}
