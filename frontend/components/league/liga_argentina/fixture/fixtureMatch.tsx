'use client'

import { ApiMatch } from '@/types/league/apiMatch'

// Extendemos la interfaz para aceptar la prop que calculamos en el padre
interface FixtureMatchProps {
  match: ApiMatch & { display_label?: string }
}

export const FixtureMatch: React.FC<FixtureMatchProps> = ({ match }) => {
  const status = match.status_short as string;

  // 2. Usamos la variable 'status' para todas las validaciones
  const isFinished = status === 'FT';
  const isPenalties = status === 'PEN' || status === 'AET';

  const liveStatuses = ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE'];
  const isLive = liveStatuses.includes(status);

  const isPending = status === 'NS' || status === 'TBD';

  return (
    <div className="group relative p-3 bg-gray-900/40 hover:bg-gray-700/50 border border-gray-700/30 rounded-xl transition-all mb-2 overflow-hidden">
      {/* Indicador lateral */}
      <div className={`absolute left-0 top-0 h-full w-1 ${isLive ? 'bg-red-500 animate-pulse' : isFinished ? 'bg-gray-600' : 'bg-transparent'
        }`} />

      <div className="flex justify-between items-center gap-2">
        {/* Local */}
        <div className="flex-1 text-right font-medium text-gray-200 truncate">
          {match.home_team.name}
        </div>

        {/* Marcador / VS */}
        <div className="flex flex-col items-center justify-center min-w-[70px]">
          <div className={`text-base font-black px-2 py-0.5 rounded-lg ${isLive ? 'bg-red-500/10 text-red-500' : 'text-white'
            }`}>
            {isPending ? (
              <span className="text-xs text-gray-500 font-bold tracking-widest">VS</span>
            ) : (
              <span className="tabular-nums">{match.home_goals ?? 0} - {match.away_goals ?? 0}</span>
            )}
          </div>
        </div>

        {/* Visitante */}
        <div className="flex-1 text-left font-medium text-gray-200 truncate">
          {match.away_team.name}
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex justify-center items-center mt-2 space-x-3">
        {isLive ? (
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-tighter">
              {status === 'HT' ? 'Entretiempo' : `En Vivo ${status}`}
            </span>
          </div>
        ) : isPenalties ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest bg-yellow-500/10 px-2 py-0.5 rounded-lg">
              Definido por Penales
            </span>
          </div>
        ) : isFinished ? (
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Finalizado</span>
        ) : (
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
            {/* CAMBIO AQUÍ: Usamos display_status que es lo que manda el padre */}
            {status || 'Próximamente'}
          </span>
        )}
      </div>
    </div>
  )
}