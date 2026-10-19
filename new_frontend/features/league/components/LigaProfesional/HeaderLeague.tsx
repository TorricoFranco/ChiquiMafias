import React from 'react';
import { Trophy, GitBranch, Radio } from 'lucide-react';

interface HeaderLeagueProps {
  onOpenBrackets: () => void;
  hasLiveMatches?: boolean;
}

export const HeaderLeague: React.FC<HeaderLeagueProps> = ({
  onOpenBrackets,
  hasLiveMatches,
}) => {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-[#1c1b1b] via-[#222221] to-[#1c1b1b] border border-[#353534] rounded-2xl p-4 sm:p-6 shadow-xl">
      <div className="flex items-start gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-[#d2f000]/10 border border-[#d2f000]/30 flex items-center justify-center flex-shrink-0 text-[#d2f000] shadow-[0_0_15px_rgba(210,240,0,0.15)]">
          <Trophy className="w-6 h-6" />
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-[#e5e2e1] uppercase tracking-tight">
              Clasificación LPF 2026
            </h1>
            {hasLiveMatches && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-extrabold tracking-wider animate-pulse">
                <Radio className="w-3 h-3 text-red-500" />
                EN VIVO
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-[#c6c9ab] mt-1 max-w-2xl leading-relaxed">
            Liga Profesional Argentina • Apertura, Clausura, Promedios y Anual
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 w-full md:w-auto">
        <button
          onClick={onOpenBrackets}
          className="flex-1 md:flex-initial flex items-center justify-center gap-2 bg-[#d2f000] hover:bg-[#b8d200] text-[#191e00] font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(210,240,0,0.25)] hover:scale-[1.02] cursor-pointer"
        >
          <GitBranch className="w-4 h-4 text-[#191e00]" />
          <span>VER LLAVES PLAYOFFS</span>
        </button>
      </div>
    </div>
  );
};
