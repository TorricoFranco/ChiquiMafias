"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { LeagueMatch } from "@/features/league/type";
import { translateStatus } from "@/features/league/utils/translateStatus";
import { formatMatchTime } from "@/features/league/utils/formatMatchTime";

interface MatchScorecardProps {
  match: LeagueMatch;
  odds?: { home: number; draw: number; away: number };
  selectedBetOption?: { matchId: string; option: "home" | "draw" | "away" } | null;
  onSelectOdds?: (matchId: string, option: "home" | "draw" | "away", oddsValue: number, teamName: string) => void;
  showOdds?: boolean;
}

export const MatchScorecard: React.FC<MatchScorecardProps> = ({
  match,
  odds = { home: 2.15, draw: 3.10, away: 2.80 },
  selectedBetOption,
  onSelectOdds,
  showOdds = false,
}) => {
  const router = useRouter();

  const isSelected = (opt: "home" | "draw" | "away") =>
    selectedBetOption?.matchId === String(match.id) && selectedBetOption.option === opt;

  const isLive = ['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE'].includes(match.status_short);
  const isFinished = ['FT', 'PEN', 'AET'].includes(match.status_short);

  const handleGoToMatch = () => {
    router.push(`/match/${match.id}`);
  };

  const renderStatusBadge = () => {
    if (isLive) {
      return (
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-red-400 font-mono uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
          <span>{translateStatus(match.status_short)}</span>
          {match.minute && <span>{match.minute}&apos;</span>}
        </div>
      );
    }

    if (match.status_short === 'FT') {
      return <span className="text-[10px] font-bold text-[#8e9285] uppercase tracking-wider">Finalizado</span>;
    }

    if (match.status_short === 'PEN') {
      return (
        <span className="inline-block px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[9px] font-black uppercase tracking-wider border border-amber-500/30">
          Penales
        </span>
      );
    }

    if (match.status_short === 'TBD') {
      return <span className="text-[10px] font-bold text-[#8e9285] uppercase tracking-wider">A Confirmar</span>;
    }

    return (
      <span className="text-[10px] font-bold text-[#c6c9ab] uppercase tracking-wider">
        {formatMatchTime(match.date)} HS
      </span>
    );
  };

  return (
    <div
      className={`bg-[#201f1f] p-3.5 md:p-4 rounded-xl border transition-all group relative overflow-hidden flex flex-col justify-between ${isLive ? 'border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'border-[#353534] hover:border-[#d2f000]/50'
        }`}
    >
      {/* ETIQUETA SUPERIOR: Estado y Botón de Acción */}
      <div className="flex items-center justify-between mb-3.5">
        {renderStatusBadge()}

        {isLive ? (
          <button
            onClick={handleGoToMatch}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-red-600/20 border border-red-500/50 rounded-full hover:bg-red-600/40 transition-colors cursor-pointer"
          >
            <span className="text-[9px] font-black text-red-400 uppercase tracking-wider">Chat Activo</span>
          </button>
        ) : (
          <button
            onClick={handleGoToMatch}
            className="text-[10px] font-bold text-sky-400 hover:text-sky-300 underline underline-offset-2 transition-colors cursor-pointer"
          >
            Ver Detalles
          </button>
        )}
      </div>
      {/* ENFRENTAMIENTO PRINCIPAL */}
      <div
        className="flex justify-between items-center px-1 cursor-pointer my-1 w-full"
        onClick={handleGoToMatch}
      >
        {/* EQUIPO LOCAL */}
        <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
          <div className="w-11 h-11 bg-[#181818] rounded-full flex items-center justify-center p-2 border border-[#353534] group-hover:border-[#d2f000]/30 transition-colors flex-shrink-0">
            {match.home_team.logo_url ? (
              <img
                src={match.home_team.logo_url}
                alt={match.home_team.name}
                className="w-full h-full object-contain"
                onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
              />
            ) : (
              <span className="text-[10px] font-black text-white">
                {match.home_team.short_code || 'LOC'}
              </span>
            )}
          </div>
          <span className="text-[11px] font-bold text-white uppercase text-center leading-tight truncate w-full px-1">
            {match.home_team.short_code || match.home_team.name}
          </span>
        </div>

        {/* MARCADOR / VS */}
        <div className="flex flex-col items-center justify-center px-2 flex-shrink-0 min-w-[64px]">
          <div className="text-xl md:text-2xl font-['Montserrat',sans-serif] font-black tracking-wider text-center">
            {isLive || isFinished ? (
              <div className="flex items-center justify-center gap-1.5">
                <span className={isLive ? 'text-emerald-400' : 'text-white'}>
                  {match.home_goals ?? 0}
                </span>
                <span className="text-[#8c8e76] text-base md:text-lg">-</span>
                <span className={isLive ? 'text-emerald-400' : 'text-white'}>
                  {match.away_goals ?? 0}
                </span>
              </div>
            ) : (
              <span className="text-sm md:text-base font-bold text-[#8c8e76] tracking-widest">VS</span>
            )}
          </div>
        </div>

        {/* EQUIPO VISITANTE */}
        <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
          <div className="w-11 h-11 bg-[#181818] rounded-full flex items-center justify-center p-2 border border-[#353534] group-hover:border-[#d2f000]/30 transition-colors flex-shrink-0">
            {match.away_team.logo_url ? (
              <img
                src={match.away_team.logo_url}
                alt={match.away_team.name}
                className="w-full h-full object-contain"
                onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
              />
            ) : (
              <span className="text-[10px] font-black text-white">
                {match.away_team.short_code || 'VIS'}
              </span>
            )}
          </div>
          <span className="text-[11px] font-bold text-white uppercase text-center leading-tight truncate w-full px-1">
            {match.away_team.short_code || match.away_team.name}
          </span>
        </div>
      </div>

      {/* CUOTAS / APUESTAS */}
      {showOdds && (
        <div className="mt-4 pt-3 border-t border-[#353534]/60 flex gap-1.5">
          <button
            type="button"
            onClick={() => onSelectOdds?.(String(match.id), "home", odds.home, match.home_team.name)}
            className={`flex-1 py-1.5 rounded-lg text-center text-[10px] font-bold transition-all cursor-pointer border ${isSelected("home")
                ? "bg-[#d2f000] text-black font-extrabold border-[#d2f000] shadow-sm"
                : "bg-[#181818] text-[#d2f000] border-[#353534] hover:bg-[#353534] hover:text-white"
              }`}
          >
            L: {odds.home.toFixed(2)}
          </button>

          <button
            type="button"
            onClick={() => onSelectOdds?.(String(match.id), "draw", odds.draw, "EMPATE")}
            className={`flex-1 py-1.5 rounded-lg text-center text-[10px] font-bold transition-all cursor-pointer border ${isSelected("draw")
                ? "bg-[#d2f000] text-black font-extrabold border-[#d2f000] shadow-sm"
                : "bg-[#181818] text-[#c6c9ab] border-[#353534] hover:bg-[#353534] hover:text-white"
              }`}
          >
            E: {odds.draw.toFixed(2)}
          </button>

          <button
            type="button"
            onClick={() => onSelectOdds?.(String(match.id), "away", odds.away, match.away_team.name)}
            className={`flex-1 py-1.5 rounded-lg text-center text-[10px] font-bold transition-all cursor-pointer border ${isSelected("away")
                ? "bg-[#d2f000] text-black font-extrabold border-[#d2f000] shadow-sm"
                : "bg-[#181818] text-[#c6c9ab] border-[#353534] hover:bg-[#353534] hover:text-white"
              }`}
          >
            V: {odds.away.toFixed(2)}
          </button>
        </div>
      )}
    </div>
  );
};