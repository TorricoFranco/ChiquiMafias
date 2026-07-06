'use client'

import { AlertTriangle, Calendar } from 'lucide-react'
import Link from 'next/link'
import { FixtureMatch } from './fixtureMatch'

interface Props {
  tournament: 'APERTURA' | 'CLAUSURA'
  matches: any[]
  activeMatchday: number | string
  onSelectMatchday: (m: any) => void
  availableStages?: { regular: number[]; playoffs: string[] }
  liveResults?: Record<string, any>
}


const STAGE_LABELS: Record<string, { short: string; full: string }> = {
  'octavos': { short: '8vos', full: 'Octavos de Final' },
  'cuartos': { short: '4tos', full: 'Cuartos de Final' },
  'semifinal': { short: 'Semi', full: 'Semifinales' },
  'final': { short: 'Final', full: 'Final' },
};

const formatMatchDate = (dateString: string) => {
  const matchDate = new Date(dateString);
  const now = new Date();
  const isToday = matchDate.toDateString() === now.toDateString();

  const tomorrow = new Date();
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = matchDate.toDateString() === tomorrow.toDateString();

  const time = matchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isToday) return `Hoy ${time}`;
  if (isTomorrow) return `Mañ. ${time}`;

  return matchDate.toLocaleDateString([], { day: '2-digit', month: '2-digit' }) + ` ${time}`;
};

export const FixturesPanel = ({
  tournament,
  matches,
  activeMatchday,
  onSelectMatchday,
  availableStages = { regular: Array.from({ length: 14 }, (_, i) => i + 1), playoffs: [] },
  liveResults = {}
}: Props) => {
  const currentStageLabel = typeof activeMatchday === 'number'
    ? `FECHA ${activeMatchday}`
    : (STAGE_LABELS[activeMatchday as string]?.full.toUpperCase() || activeMatchday);

  return (
    <div className="p-4 bg-[#161616] rounded-xl border border-gray-800/50 shadow-2xl">
      <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
        <h3 className="text-lg font-bold text-white flex items-center">
          <Calendar className="w-5 h-5 mr-2 text-sky-500" />
          Fixture {tournament === 'APERTURA' ? 'Apertura' : 'Clausura'}
        </h3>
        {/* Label dinámico según la fase */}
        <span className="text-[10px] bg-sky-500/10 text-sky-500 px-2 py-1 rounded-md font-bold transition-all">
          {currentStageLabel}
        </span>
      </div>

      {/* Selector de Jornadas Mejorado */}
      <div className="flex items-center overflow-x-auto space-x-2 py-2 mb-4 scrollbar-hide border-b border-gray-800/50 custom-scrollbar">

        {/* 1. RENDERIZAR FECHAS REGULARES (Círculos) */}
        {availableStages.regular.map((mNumber) => (
          <button
            key={`reg-${mNumber}`}
            onClick={() => onSelectMatchday(mNumber)}
            className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300
              ${mNumber === activeMatchday
                ? 'bg-sky-500 text-white shadow-[0_0_15px_rgba(14,165,233,0.4)] scale-110'
                : 'bg-gray-900 text-gray-500 hover:bg-gray-800 hover:text-gray-300'
              }`}
          >
            {mNumber}
          </button>
        ))}

        {/* Separador visual si hay ambos */}
        {availableStages.playoffs.length > 0 && (
          <div className="w-[1px] h-6 bg-gray-800 mx-1" />
        )}

        {/* 2. RENDERIZAR PLAYOFFS (Pills ovaladas para que entre el texto) */}
        {availableStages.playoffs.map((pKey) => {
          const isActive = activeMatchday === pKey;
          const label = STAGE_LABELS[pKey.toLowerCase()]?.short || pKey;

          return (
            <button
              key={`playoff-${pKey}`}
              onClick={() => onSelectMatchday(pKey)}
              className={`flex-shrink-0 px-4 h-9 rounded-full flex items-center justify-center text-[10px] font-bold uppercase tracking-wider transition-all duration-300
                ${isActive
                  ? 'bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)] scale-105'
                  : 'bg-gray-900 text-gray-500 hover:bg-gray-800 hover:text-gray-300 border border-gray-800'
                }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Listado de partidos (Misma lógica que tenías) */}
      <div className="h-[650px] overflow-y-auto pr-2 custom-scrollbar">
        <div className="space-y-1.5">
          {matches.map((match) => {
            const liveUpdate = liveResults[match.id];
            const liveStatuses = ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE'];
            const currentStatus = liveUpdate?.status || match.status_short;
            const isLive = liveStatuses.includes(currentStatus);
            const isFinished = ['FT', 'AET', 'PEN'].includes(currentStatus);

            let displayStatus = "";
            if (isLive) {
              displayStatus = liveUpdate?.elapsed ? `${liveUpdate.elapsed}'` : (match.elapsed ? `${match.elapsed}'` : 'LIVE');
            } else if (isFinished) {
              displayStatus = 'FT';
            } else {
              displayStatus = formatMatchDate(match.date);
            }

            const normalizedMatch = {
              ...match,
              home_goals: liveUpdate ? liveUpdate.h : match.home_goals,
              away_goals: liveUpdate ? liveUpdate.a : match.away_goals,
              status_short: currentStatus,
              display_status: displayStatus,
              is_live: isLive
            };

            return (
              <Link
                key={match.id}
                href={`/match/${match.id}`}
                className="block group scale-[0.98] hover:scale-[1] transition-transform origin-left"
              >
                <FixtureMatch match={normalizedMatch} />
              </Link>
            );
          })}
          {
            matches.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-gray-600">
                <AlertTriangle className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm italic">No hay partidos cargados</p>
              </div>
            )
          }
        </div>
      </div>
    </div>
  )
}

