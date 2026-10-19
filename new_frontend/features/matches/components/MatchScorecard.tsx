"use client";

import React from "react";
import { MatchData } from "../types";

interface MatchScorecardProps {
  match: MatchData;
  selectedBetOption?: { matchId: string; option: "home" | "draw" | "away" } | null;
  onSelectOdds?: (matchId: string, option: "home" | "draw" | "away", oddsValue: number, teamName: string) => void;
}

export const MatchScorecard: React.FC<MatchScorecardProps> = ({
  match,
  selectedBetOption,
  onSelectOdds,
}) => {
  const isSelected = (opt: "home" | "draw" | "away") =>
    selectedBetOption?.matchId === match.id && selectedBetOption.option === opt;

  return (
    <div className="bg-[#201f1f] p-4 rounded-xl border border-[#454932] hover:border-[#d2f000]/50 transition-all cursor-pointer group">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[9px] font-bold text-[#c6c9ab] uppercase tracking-tighter">
          {match.league} • {match.minute}
        </span>
        <span className="w-2 h-2 bg-red-600 rounded-full live-pulse"></span>
      </div>

      <div className="flex justify-between items-center px-2">
        {/* Team A */}
        <div className="flex flex-col items-center gap-1 w-1/3">
          {match.teamA.logoUrl ? (
            <img
              src={match.teamA.logoUrl}
              alt={match.teamA.name}
              className="w-8 h-8 object-contain"
            />
          ) : (
            <div className="w-8 h-8 bg-[#353534] rounded-full flex items-center justify-center text-[10px] font-bold text-white">
              {match.teamA.code}
            </div>
          )}
          <span className="text-[10px] font-bold text-white uppercase">{match.teamA.name}</span>
        </div>

        {/* Score */}
        <div className="text-2xl font-['Montserrat',sans-serif] font-bold text-white">
          {match.scoreA} - {match.scoreB}
        </div>

        {/* Team B */}
        <div className="flex flex-col items-center gap-1 w-1/3">
          {match.teamB.logoUrl ? (
            <img
              src={match.teamB.logoUrl}
              alt={match.teamB.name}
              className="w-8 h-8 object-contain"
            />
          ) : (
            <div className="w-8 h-8 bg-[#353534] rounded-full flex items-center justify-center text-[10px] font-bold text-white">
              {match.teamB.code}
            </div>
          )}
          <span className="text-[10px] font-bold text-white uppercase">{match.teamB.name}</span>
        </div>
      </div>

      {/* Odds pills */}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() =>
            onSelectOdds?.(match.id, "home", match.odds.home, match.teamA.name)
          }
          className={`flex-1 py-1.5 rounded text-center text-[10px] font-bold transition-all cursor-pointer ${
            isSelected("home")
              ? "bg-[#d2f000] text-[#191e00] ring-2 ring-[#d2f000]"
              : "bg-[#353534] text-[#d2f000] hover:bg-[#454932]"
          }`}
        >
          L: {match.odds.home.toFixed(2)}
        </button>

        <button
          type="button"
          onClick={() =>
            onSelectOdds?.(match.id, "draw", match.odds.draw, "EMPATE")
          }
          className={`flex-1 py-1.5 rounded text-center text-[10px] font-bold transition-all cursor-pointer ${
            isSelected("draw")
              ? "bg-[#d2f000] text-[#191e00] ring-2 ring-[#d2f000]"
              : "bg-[#353534] text-[#c6c9ab] hover:bg-[#454932]"
          }`}
        >
          E: {match.odds.draw.toFixed(2)}
        </button>

        <button
          type="button"
          onClick={() =>
            onSelectOdds?.(match.id, "away", match.odds.away, match.teamB.name)
          }
          className={`flex-1 py-1.5 rounded text-center text-[10px] font-bold transition-all cursor-pointer ${
            isSelected("away")
              ? "bg-[#d2f000] text-[#191e00] ring-2 ring-[#d2f000]"
              : "bg-[#353534] text-[#c6c9ab] hover:bg-[#454932]"
          }`}
        >
          V: {match.odds.away.toFixed(2)}
        </button>
      </div>
    </div>
  );
};
