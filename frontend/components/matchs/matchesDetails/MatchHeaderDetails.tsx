import { CalendarDays } from "lucide-react";
import { getStatusLabel, isLiveStatus } from "@/helpers/match-status.helper";
import { useEffect, useState } from "react";

interface Team {
  id: string | number;
  name: string;
  logo: string;
}

interface MatchHeaderProps {
  metadata: {
    status: string;
    tournament: string;
    round: string;
    date: string;
  };
  score: {
    home: number;
    away: number;
    home_penalties?: number | null;
    away_penalties?: number | null;
    elapsed?: number;
    summary?: {
      goals?: { player: string; min: number; team: string | number }[];
      redCards?: { player: string; team: string | number }[];
    };
  };
  teams: {
    home: Team;
    away: Team;
  };
}

// 2. Aplicamos la interface al componente
export const MatchHeader = ({ metadata, score, teams }: MatchHeaderProps) => {
  const isNotStarted = metadata.status === "NS" || metadata.status === "TBD";
  const isLive = isLiveStatus(metadata.status);
  const isFinished = metadata.status === "FT" || metadata.status === "AET" || metadata.status === "PEN";
  
  // Usamos el operador de nulidad segura en las comprobaciones
  const hasPenalties = 
    score.home_penalties !== null && score.home_penalties !== undefined && 
    score.away_penalties !== null && score.away_penalties !== undefined;
    
  const hasExtraTime = metadata.status === "AET" || metadata.status === "PEN" || (score.elapsed !== undefined && score.elapsed >= 90);

  const homeGoals = score.summary?.goals?.filter(g => g.team === teams.home.id) || [];
  const awayGoals = score.summary?.goals?.filter(g => g.team === teams.away.id) || [];

  const homeRedCards = score.summary?.redCards?.filter(r => r.team === teams.home.id) || [];
  const awayRedCards = score.summary?.redCards?.filter(r => r.team === teams.away.id) || [];

  const [formattedTime, setFormattedTime] = useState("");
  const [formattedDate, setFormattedDate] = useState("");

  useEffect(() => {
    const date = new Date(metadata.date);
    setFormattedTime(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setFormattedDate(date.toLocaleDateString());
  }, [metadata.date]);

  const RedCardIcon = () => (
    <span className="inline-block w-1.5 h-2.5 bg-red-600 rounded-sm ml-1 shadow-lg ring-1 ring-red-800/50" title="Tarjeta Roja" />
  );

  return (
    <div className="relative overflow-hidden bg-[#111] border-b border-white/10 pt-12 pb-10 px-6">
      <div className="absolute inset-0 bg-gradient-to-b from-sky-500/5 to-transparent pointer-events-none" />

      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-center gap-4 mb-8">
          <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-sky-400 uppercase tracking-widest">
            {metadata.tournament} - {metadata.round}
          </span>
        </div>

        <div className="grid grid-cols-3 items-start gap-4">
          {/* HOME TEAM */}
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-white/5 rounded-3xl p-4 border border-white/5 shadow-2xl mb-4 flex-shrink-0">
              <img src={teams.home.logo} alt={teams.home.name} className="w-full h-full object-contain" />
            </div>
            <h2 className="text-sm md:text-lg font-black uppercase italic leading-tight mb-2 text-center">
              {teams.home.name}
            </h2>
            <div className="hidden md:flex flex-col items-center gap-1">
              {homeGoals.map((g, i) => (
                <span key={`goal-${i}`} className="text-[10px] text-gray-400 font-medium">
                  {g.player} {g.min}'
                </span>
              ))}
              {homeRedCards.map((r, i) => (
                <span key={`red-${i}`} className="text-[10px] text-red-500 font-bold flex items-center">
                  {r.player} <RedCardIcon />
                </span>
              ))}
            </div>
          </div>

          {/* SCORE */}
          <div className="flex flex-col items-center justify-start pt-4">
            {isNotStarted ? (
              <div className="flex flex-col items-center gap-2">
                <CalendarDays className="w-6 h-6 text-sky-500 mb-2" />
                <span className="text-2xl md:text-3xl font-black italic">{formattedTime} HS</span>
                <span className="text-[10px]">{formattedDate}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-4 md:gap-8">
                  <span className="text-5xl md:text-7xl font-black italic tracking-tighter leading-none">{score.home}</span>
                  <span className="text-xl md:text-3xl font-black text-white/20 italic">-</span>
                  <span className="text-5xl md:text-7xl font-black italic tracking-tighter leading-none">{score.away}</span>
                </div>
                {hasPenalties && (
                  <div className="mt-2 flex items-center gap-4 md:gap-6">
                    <span className="text-xl md:text-2xl font-black italic text-yellow-500">{score.home_penalties}</span>
                    <span className="text-xs md:text-sm font-bold text-yellow-600 uppercase tracking-wider">p</span>
                    <span className="text-xl md:text-2xl font-black italic text-yellow-500">{score.away_penalties}</span>
                  </div>
                )}
                <div className="mt-4 flex flex-col items-center gap-1">
                  {isLive && <span className="text-sky-400 font-bold text-sm animate-pulse">{score.elapsed}'</span>}
                  {isFinished && hasExtraTime && (
                    <span className="text-[9px] text-white font-bold uppercase tracking-widest bg-orange-600/60 px-2 py-0.5 rounded">
                      120+{metadata.status === "PEN" ? "P" : ""}
                    </span>
                  )}
                  <span className="text-[9px] text-white font-bold uppercase tracking-widest bg-sky-600 px-2 py-0.5 rounded shadow-lg">
                    {getStatusLabel(metadata.status)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* AWAY TEAM */}
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-white/5 rounded-3xl p-4 border border-white/5 shadow-2xl mb-4 flex-shrink-0">
              <img src={teams.away.logo} alt={teams.away.name} className="w-full h-full object-contain" />
            </div>
            <h2 className="text-sm md:text-lg font-black uppercase italic leading-tight mb-2 text-center">
              {teams.away.name}
            </h2>
            <div className="hidden md:flex flex-col items-center gap-1">
              {awayGoals.map((g, i) => (
                <span key={`goal-${i}`} className="text-[10px] text-gray-400 font-medium">
                  {g.player} {g.min}'
                </span>
              ))}
              {awayRedCards.map((r, i) => (
                <span key={`red-${i}`} className="text-[10px] text-red-500 font-bold flex items-center">
                  {r.player} <RedCardIcon />
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};